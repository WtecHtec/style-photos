import './app.css';
import { bitable, FieldType, IAttachmentField, } from "@lark-base-open/js-sdk";
import { Banner, Typography, Select, Switch, Button, Empty, Image, Modal, Spin, Upload, Toast, Input } from '@douyinfe/semi-ui';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useDebounce } from './useDebounce';
import { STYLE_DATAS}  from './config'
import { IllustrationNoContent, IllustrationNoContentDark } from '@douyinfe/semi-illustrations';
import { t } from 'i18next';
import { fileToIOpenAttachment, fileToURL, urlToFile } from './uitl/shared';
import { deepCopy, generateUuidByTime } from './uitl/uitls';
import SourceIcon from './components/icons/source';
import TargetIcon from './components/icons/target';
import PerviewIcon from './components/icons/preview';
import SaveIcon from './components/icons/save';
export default function App() { 
	const { Text } = Typography;
  
	const [isAttachment, setIsAttachment] = useState(false);
	const [photoDisabled, setPhotoDisabled] = useState(true);
	const [targetSelected, setTargetSelected] = useState<any>({
		filed: '',
		recordId: '',
		selectImages: [],
	});
	const [styleDatas, setStyleDatas] = useState([...STYLE_DATAS])
	const [selectStyle, setSelectStyle] = useState<any|null>([...STYLE_DATAS][0]);
	const [modalOpen, setModalOpen] = useState(false);
	const [saveSelected, setSaveSelected] = useState<any>(null);
	const [genResult, setGenResult] = useState<any>({
		taskId: 1712242960339951,
		"imageUrl": "https://mj.openai-next.com/mj/image/1712242960339951",
	});
	const uploadRef = useRef();

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
			if (!modalOpen) {
				formatTargetData(event.data)
			} else {
				formatSaveSelectedData(event.data)
			}
		});
		return ()=> {
			off();
		}
	}, [modalOpen])

	const saveTable = useCallback(function saveTable(selected: any) {
    return selected.field.setValue(
      selected.select.recordId,
      selected.selectImages.map((item: any) => item.val)
    );
  }, []);
	
	const customRequest = useCallback(
    async (o: any) => {
      console.log(o);
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
	const handleGenerate = () => {
		const selectCurTarget = getCurrentTarget();
		const selectCurSource = getCurrentStyle();
		if (!selectCurTarget || selectCurTarget.length === 0) {
			Toast.success({ content: '请选择源图片' });
			return;
		}
		if (!selectCurSource || selectCurSource.length === 0) {
			Toast.success({ content: '请选择模仿图片' });
			return;
		}
		const { total } = selectCurSource[0];
		console.log(selectCurSource, selectCurTarget);
		setPhotoDisabled(false);
	}
	
	const handleModalOk = async () => {
		if(!saveSelected) {
			Toast.warning({ content: `请选择正确的单元格！`});
			return
		}
		const file = await urlToFile(genResult.imageUrl, `${generateUuidByTime()}.png`, 'image/png')
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
	}
	return (
		<main className="main">
 			<Banner fullMode={false} type="info" bordered icon={null} closeIcon={null}
				// title={<div style={{ fontWeight: 600, fontSize: '14px', lineHeight: '20px' }}></div>}
				description={<div> 专属自己的AI照相馆</div>}
      />

				<Banner
				   style={{ marginTop: '12px'}}
            fullMode={false}
            title=""
            type="warning"
						icon={<SourceIcon></SourceIcon>}
            closeIcon={null}
            description={<div className="flex-btw"> 请选择有图片的单元格(源图片)
							<Switch style={{ display: "none"}} checked={photoDisabled} onChange={setPhotoDisabled} size="small"></Switch></div> }
        >
        </Banner>
				{
					isAttachment ? <div style={{ marginTop: '4px', pointerEvents: !photoDisabled ? 'none' : 'auto' }} >
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
										<div style={{ position: 'relative'}}>
											<img style={{ cursor: 'pointer', width: '80px', height: '80px', margin: '4px' }}
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
			  <Select defaultValue="career" onChange={(e: any) => {setSelectStyle(styleDatas.find((item: any) => item.key === e))}} style={{ width: '100%'}}>
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
				<Button type="primary" style={{ marginTop: '12px'}} onClick={handleGenerate}>生成</Button>
			
			 {
				genResult ? <>
					<Banner
						style={{ marginTop: '12px'}}
								fullMode={false}
								title=""
								type="warning"
								closeIcon={null}
								icon={<PerviewIcon></PerviewIcon>}
								description={ <div className="flex-btw">预览结果
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
					onCancel={() => {setModalOpen(false)}}
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

		</main>
	)
}