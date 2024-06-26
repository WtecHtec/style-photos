import './App.css';
import { bitable, FieldType, IAttachmentField, } from "@lark-base-open/js-sdk";
import { Banner, Select, Switch, Button, Empty, Image, Modal, Spin, Upload, Toast, Input } from '@douyinfe/semi-ui';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useDebounce } from './useDebounce';
import { STYLE_DATAS}  from './config'
import { IllustrationNoContent, IllustrationNoContentDark } from '@douyinfe/semi-illustrations';
import { base64ToFile, fileToIOpenAttachment, fileToURL, urlToFile } from './uitl/shared';
import { deepCopy, generateUuidByTime, mergeImage } from './uitl/uitls';
import SourceIcon from './components/icons/source';
import TargetIcon from './components/icons/target';
import PerviewIcon from './components/icons/preview';
import SaveIcon from './components/icons/save';
import { getApiStyles, getApiTaskDetails, postApiAuth, postApiPhoto } from './uitl/api';
export default function App() { 
  
	const [isAttachment, setIsAttachment] = useState(false);
	const [targetSelected, setTargetSelected] = useState<any>({
		filed: '',
		recordId: '',
		selectImages: [],
	});
	const [styleDatas, setStyleDatas] = useState<any[]>([])
	const [selectStyle, setSelectStyle] = useState<any|null>(null);
	const [modalOpen, setModalOpen] = useState(false);
	const [saveSelected, setSaveSelected] = useState<any>(null);
	const [genResult, setGenResult] = useState<any>(null);
	const [submitting, setSubmitting] = useState(false);
	const uploadRef = useRef();
	const canvasRef = useRef<any>();
	const gloalRef = useRef<any>({ recount: 10, timer: 0});
	const [saving, setSaving ] = useState(false);
 
	const handleAuth = async () => {
		const tid = Toast.info({
			showClose: false,
			duration: 0,
			icon: <Spin />,
			content: 'loading',
		});
		const [err, res] = await postApiAuth();
		if (!err && res &&  res.token) {
			await bitable.bridge.setData("authorization", res.token);
			handleStylesDatas()
		} else {
			Toast.error({ content: '授权失败,请尝试刷新。' });
		}
		Toast.close(tid);
	}
	const handleStylesDatas = async () => {
		const [err, res] = await getApiStyles()
		if (!err && res) {
			setStyleDatas(res);
			const newSel = deepCopy(res[0]);
			setSelectStyle(newSel);
		}
	}
	useEffect(() => {
		handleAuth();
		return () => {
			clearRetryTimer();
		}
	}, [])

	const clearRetryTimer = () => {
		if (gloalRef.current.timer) {
			clearTimeout(gloalRef.current.timer);
			gloalRef.current.timer = null;
		}
	}
	const checkIsAttachment = async (selection: any): Promise<[boolean, IAttachmentField]> => {
		const { fieldId, tableId } = selection;
		const table = await bitable.base.getTableById(tableId);
		const attachmentField = await table.getField<IAttachmentField>(fieldId);
		const type = await attachmentField.getType();
		const status = (type === FieldType.Attachment);
		return [status, attachmentField];
	}

	const formatSaveSelectedData = useDebounce(async (selection: any) => {
		const { recordId } = selection;
		const [status, attachmentField]  = await checkIsAttachment(selection);
		if (status) {
			const name = await attachmentField.getName();
			const urls = (await attachmentField.getAttachmentUrls(recordId).catch((err: any) => [])) || [];
			const vals = (await attachmentField.getValue(recordId).catch((err: any) => [])) || [];
			const result: any = {
				name,
				field: attachmentField,
				selectImages: [],
				select: selection,
			};
			vals.map((val: any, i: number) => {
				result.selectImages.push({
					val,
					url: urls[i],
				});
			});
			setSaveSelected(result);
		} else {
			setSaveSelected(null)
		}
	}, 500)
	const formatTargetData = useDebounce(async (selection: any) => {
		const { recordId } = selection;
		const [status, attachmentField]  = await checkIsAttachment(selection);
		setIsAttachment(status as boolean);
		if (status) {
			const urls = (await attachmentField.getAttachmentUrls(recordId).catch((err: any) => [])) || [];
			const vals = (await attachmentField.getValue(recordId).catch((err: any) => [])) || [];
			const result: any = {
				field: attachmentField,
				selectImages: [],
				select: selection,
			};
			vals.map((val: any, i: number) => {
				result.selectImages.push({
					val,
					url: urls[i],
				});
			});
			setTargetSelected({
				...result,
			})
		}
	}, 500);

	useEffect(() => {
		const off = bitable.base.onSelectionChange((event: any) => {
			if (submitting) return;
			if (!modalOpen) {
				formatTargetData(event.data)
			} else {
				formatSaveSelectedData(event.data)
			}
		});
		return ()=> {
			off();
		}
	}, [modalOpen, submitting])

	const saveTable = useCallback(function saveTable(selected: any) {
    return selected.field.setValue(
      selected.select.recordId,
      selected.selectImages.map((item: any) => item.val)
    );
  }, []);
	
	const customRequest = useCallback(
    async (o: any) => {
      const file = o.fileInstance;
      if (!file) {
        return;
      }
      const tid = Toast.info({
        showClose: false,
        duration: 0,
        icon: <Spin />,
        content: 'loading',
      });
      const newSelectImage = {
        val: await fileToIOpenAttachment(bitable.base, file),
        url: await fileToURL(file),
				checked: false,
				index: -1,
      };
      if (!targetSelected?.selectImages) return;
      const newSelectImages = targetSelected.selectImages;
      newSelectImages.push(newSelectImage);
      const newSelected: any = {
        ...targetSelected,
        selectImages: newSelectImages,
      };
			saveTable(newSelected);
      setTargetSelected(newSelected);
      Toast.close(tid);
      Toast.success({ content: `上传成功：${file.name} `});
      o.onSuccess({ status: 201 });
    },
    [targetSelected]
  );
	const handleSelectMulTarget = (index: number) => {
		const newSelectImages = targetSelected.selectImages;
		const checked = !newSelectImages[index].checked;
		let checkIdx = 0;
		newSelectImages.forEach((element: any) => {
			if (element.checked) checkIdx = checkIdx + 1;
			if (!checked && element.index > newSelectImages[index].index) {
				element.index = element.index - 1
			}
		});
		newSelectImages[index].index = checked ? checkIdx + 1 : -1;
		newSelectImages[index].checked = checked;
		const newSelected: any = {
			...targetSelected,
			selectImages: newSelectImages,
		};
		setTargetSelected(newSelected);
	}

	const handleSelectTarget = (index: number) => {
		const newSelectImages = selectStyle.selectImages;
		const checked = !newSelectImages[index].checked;
		newSelectImages.forEach((element: any) => {
			if (element.checked)  element.checked = false;
		});
		newSelectImages[index].checked = checked;
		const newSelected: any = {
			...selectStyle,
			selectImages: newSelectImages,
		};
		setSelectStyle(newSelected);
	}

	const getCurrentTarget = () => {
		return deepCopy(targetSelected.selectImages)
			.sort((a: { index: number; }, b: { index: number; }) => a.index - b.index)
			.filter((item: { checked: any; }) => item.checked);
	}
	const getCurrentStyle = () => {
		return selectStyle.selectImages.filter((item: { checked: any; }) => item.checked);
	}
	const handleGenerate = useDebounce( async () => {
		console.log('submitting---', submitting)
		if (submitting) return;
		const selectCurTarget = getCurrentTarget();
		const selectCurSource = getCurrentStyle();
		if (!selectCurTarget || selectCurTarget.length === 0) {
			Toast.warning({ content: '请选择源图片' });
			return;
		}
		if (!selectCurSource || selectCurSource.length === 0) {
			Toast.warning({ content: '请选择模仿图片' });
			return;
		}
		const { total, blocks } = selectCurSource[0];
		if (total < selectCurTarget.length) {
			Toast.warning({ content: '源图片数量不能大于模仿图片中人数' });
			return;
		}
		if (total > selectCurTarget.length) {
			Toast.warning({ content: '源图片数量不能小于模仿图片中人数' });
			return;
		}
		if (total > 1 && (!blocks || blocks.length !== total)) {
			Toast.error({ content: '数据异常' });
			return;
		}
		console.log(selectCurSource, selectCurTarget);
		const sourceUrls = selectCurTarget.map((item: any) => {
			return item.url
		})
		setSubmitting(true);
		const photoDatas = await handlePhotos(sourceUrls, selectCurSource[0]);
		// const photoDatas = {
		// 	url: "https://stylephotoserver.zeabur.app/images/wedding/wedding_db_1.png",
		// 	// url: "http://localhost:3000/images/wedding/wedding_db_1.png",
		// 	total: 2,
		// 	results: [{
		// 		imageUrl: "https://mj.openai-next.com/mj/image/1712882258045974",
		// 		taskid: "1712882258045974"
		// 	},
		// 	{
		// 		imageUrl: "https://mj.openai-next.com/mj/image/1712882302777085",
    //     taskid: "1712882302777085"
		// 	}
		// ]
		// }
		// console.log('photoDatas---', photoDatas);
		if (!photoDatas) {
			Toast.warning({ content: '生成失败。'})
			setSubmitting(false);
			return;
		}
		createImageResult(photoDatas);
	}, 500);

	const handlePhotos = async (sourceUrls: any, selectCurSource: any ) => {
		const { total, url, blocks } = selectCurSource
		const results = [];
		// await getGenResult('1712898203252403', 2);
		// return;
		for (let i = 0 ; i < sourceUrls.length; i++) {
			const [err, res] = await postApiPhoto(sourceUrls[i], total === 1 ? url : blocks[i]);
			if (!err && res
				&& res.result
				&& res.result.result
				&& res.result.code
				&& [1, 22].includes(Number(res.result.code))) {
				const itemRes = await getGenResult(res.result.result, Number(res.result.code));
				if (!itemRes) {
					return;
				}
				results.push(itemRes);
			} else {
				return;
			}
		}
		if (results.length !== total) {
			return;
		}
		return { url, results, total };
	}


	const createImageResult = async ( photoData: any ) => {
		if (!photoData)  {
			setSubmitting(false);
			return;
		}
		const { url, results, total } = photoData;
		if (total === 1) {
			setGenResult({
				type: 'url',
				imageUrl: results[0].imageUrl,
			})
			setSubmitting(false);
			return;
		}
		const base64 = await mergeImage(url, canvasRef.current,  results.map((item: any) => item.imageUrl))
		if (!base64) {
			Toast.warning({ content: '生成失败。'})
			setSubmitting(false);
			return
		}
		setGenResult({
			type: 'base64',
			imageUrl: base64,
		})
		setSubmitting(false);
	}


	const getGenResult = async (taskid: string, code: number) => {
		const [err, res] = await getTaskDetail(taskid)
		console.log('code--', code);
		if (err === 0) {
			return res;
		} else if (err === 2) {
			return await retryGetTaskDetail(taskid);
		} else {
			return null
		}
	}
	// 隔 5 s去请求
	const getTaskDetail =  (taskid: string, delay: number = 5): Promise<any>  => {
		let timer: number | null | undefined = null;
		return new Promise( (resolve) => {
			timer = setTimeout(async () => {
				const [err, res] = await getApiTaskDetails(taskid)
				if (!err && res && res.result) {
					if (res.result.imageUrl && res.result.status === "SUCCESS") {
						if (timer) clearTimeout(timer);
						resolve([0 ,{
							taskid,
							imageUrl: res.result.imageUrl,
						}]);
					} else {
						if (timer) clearTimeout(timer);
						resolve([2, ''])
					}
				} else {
					if (timer) clearTimeout(timer);
					resolve([-1, '']);
				}
			}, 1000 * delay);
		})
	}
	const retryGetTaskDetail = (taskid: string,)=> {
		
		return new Promise(async (resolve) => {
			let recount  = gloalRef.current.recount
			while(recount) {
				const [err, res] = await getTaskDetail(taskid, 60);
				if (err === -1) {
					resolve('');
					return
				} else if (err === 2) {
					recount = recount - 1;
					console.log('重试', recount)
				} else {
					resolve(res);
					return
				}
			}
			console.log('重试失败');
			resolve('');
		})
	}
	const handleModalOk = async () => {
		if (saving) return
		if(!saveSelected) {
			Toast.warning({ content: `请选择正确的单元格！`});
			return
		}
		setSaving(true);
		const file = genResult.type === 'url' ?
		 await urlToFile(genResult.imageUrl, `${generateUuidByTime()}.png`, 'image/png')
		 : await base64ToFile(genResult.imageUrl, `${generateUuidByTime()}.png`, 'image/png')
		const newSelectImage = {
			val: await fileToIOpenAttachment(bitable.base, file),
			url: await fileToURL(file),
		};
		const newSelectImages = saveSelected.selectImages;
		newSelectImages.push(newSelectImage);
		const newSelected: any = {
			...saveSelected,
			selectImages: newSelectImages,
		};
		saveTable(newSelected);
		setModalOpen(false)
		setSaving(false);
	}
	return (
		<main className="main" style={{ pointerEvents: submitting ? 'none' : 'auto'}}>
 			<Banner fullMode={false} type="info" bordered icon={null} closeIcon={null}
				// title={<div style={{ fontWeight: 600, fontSize: '14px', lineHeight: '20px' }}></div>}
				description={<div> 专属自己的AI照相馆; 注意图片性别顺序;</div>}
      />

				<Banner
				   style={{ marginTop: '12px'}}
            fullMode={false}
            title=""
            type="warning"
						icon={<SourceIcon></SourceIcon>}
            closeIcon={null}
            description={<div className="flex-btw"> 请选择有图片的单元格(源图片)</div> }
        >
        </Banner>
				{
					isAttachment ? <div style={{ marginTop: '4px' }} >
						<Button size="small" onClick={() => (uploadRef.current as any)?.openFileDialog()}>
									上传
						</Button>
						<Upload
						 style={{ display: 'none' }}
							action="/upload"
							ref={uploadRef as any}
							draggable={true}
							multiple={false}
							showUploadList={false}
							customRequest={customRequest}
						>	
						</Upload>

							<div style={{ display: 'flex', flexWrap: 'wrap' }}>
								{
								 targetSelected && targetSelected.selectImages ? 	targetSelected.selectImages.map((item: any, index: number) => 
										<div style={{ position: 'relative', margin: '4px'}} className="show-img-border" >
											<img className="show-img  "
												onClick={() => {
													handleSelectMulTarget(index)
												}}  
													src={ item.val.type.includes("image")? item.url : "./no-image.svg"}></img>
											<div className="select-target" style={{ display: item.checked ?  'flex' : 'none',}}> {item.index}</div>
										</div>
									) : null
								}
							</div>

						</div>  :  <Empty
							image={<IllustrationNoContent style={{ width: 80, height: 80 }} />}
							darkModeImage={<IllustrationNoContentDark style={{ width: 80, height: 80 }} />}
							description="请选择有图片的单元格"
					></Empty>
				}
			 <Banner
			  style={{ marginTop: '12px'}}
            fullMode={false}
            title=""
            type="warning"
						icon={<TargetIcon></TargetIcon>}
            closeIcon={null}
            description="请选择需要模仿的照片风格"
        >
        </Banner>
			  <Select defaultValue="career" onChange={(e: any) => {setSelectStyle(deepCopy(styleDatas.find((item: any) => item.key === e) || {}))}} style={{ width: '100%'}}>
					{
						styleDatas.map(( { key, label }) =>  <Select.Option value={key}>{label}</Select.Option> )
					}
        </Select>
				{
					selectStyle && selectStyle.selectImages ? <div style={{ marginTop: '4px',}} >
							<div style={{ display: 'flex', flexWrap: 'wrap' }}>
								{
									selectStyle.selectImages.map((item: any, index: number) => 
										<div style={{ position: 'relative'}} className={ `${item.checked && 'selected-bd '}` }>
											<img  className="show-img"
												onClick={() => {
													handleSelectTarget(index)
												}}
													src={ item.url ? item.url : "./no-image.svg"}></img>
											{/* <div className="select-target" style={{ width: '6px', height: '6px',  display: item.checked ?  'flex' : 'none',}}></div> */}
										</div>
									)
								}
							</div>
						 </div> : null
				}
				<Button loading={submitting}  type="primary" style={{ marginTop: '12px'}} onClick={handleGenerate}>生成</Button>
			
			 {
				genResult ? <>
					<Banner
						style={{ marginTop: '12px'}}
								fullMode={false}
								title=""
								type="warning"
								closeIcon={null}
								icon={<PerviewIcon></PerviewIcon>}
								description={ <div className="flex-btw">点击图片预览
									<Button size="small" onClick={() => {setModalOpen(true); setSaveSelected(null);}} >{ modalOpen ? '保存中' : '保存' }</Button></div>}
						>
					</Banner>
					<Image 
						className="show-img"
						width={80}
						height={80}
						src={genResult.imageUrl}
					/>
				</> : null
			 }
				<Modal
				  centered={true}
					title="正在保存"
					visible={modalOpen}
					onOk={handleModalOk}
					onCancel={() => { !saving && setModalOpen(false)}}
					maskClosable={false}
					width={360}
				>
					<Banner
            fullMode={false}
            title=""
            type="warning"
						icon={<SaveIcon></SaveIcon>}
            closeIcon={null}
            description="请选择附件类型的单元格"
					>
					</Banner>
					{
						<Input
							style={{ cursor: 'pointer'}}
							value={ saveSelected ? saveSelected.name || '' : ''}
							disabled>
						</Input>
					}
				</Modal>
				<canvas ref={canvasRef} style={{ position: 'absolute', zIndex: '-9999', display: 'none'}}></canvas>
		</main>
	)
}