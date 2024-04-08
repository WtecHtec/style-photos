import './app.css';
import { bitable, FieldType, IAttachmentField, IRecordType, ITable, } from "@lark-base-open/js-sdk";
import { Banner, Button, Form, Image, Notification, Spin } from '@douyinfe/semi-ui';
import { BaseFormApi } from '@douyinfe/semi-foundation/lib/es/form/interface';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useDebounce } from './useDebounce';
import { generateFileFromBase64, generateUuidByTime, getBase64FromUrl } from './uitl/uitls';
const productFieldId = 'fldCeabJmL'
export default function App() {
  const formApi = useRef<BaseFormApi>();
	const [formData, setFormData] = useState({
		source: '',
		target: '',
		selection: null,
	});
	// const [submitting, setSubmitting] = useState(false);
	const [submitting, setSubmitting] = useState(false);
  const handleGenerate = useCallback(async () => {
		if (submitting || !formData.selection) return;
		setSubmitting(true);
		const { recordId, tableId } = (formData.selection || {}) as any
		console.log('formData.selection--', formData.selection)
    // const file = new File(['text'], 	`${generateUuidByTime()}.txt`, { type: "text/plain" });
		
		// try {
		// 	const base64 = await getBase64FromUrl(formData.source)
		// 	const file = generateFileFromBase64(base64, `${generateUuidByTime()}.png`);
		// 	const table = await bitable.base.getTableById(tableId);
		// 	const attachmentField = await table.getField<IAttachmentField>(productFieldId);
		// 	if (recordId) {
		// 		await attachmentField.setValue(recordId, file);
		// 	}
		// } catch (error) {
		// 	console.log('product img error', error)
		// }
		try {
			const response = await fetch(`http://localhost:3000/photo`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					sourceurl: formData.source,
					targeturl: formData.target,
				}),
			});
			if (!response.ok) {
				const errorMsg = await response.text();
				console.error(errorMsg);
				throw new Error(errorMsg);
			}
		} catch (error) {
			console.error(error);
			Notification.error({
				content: '生成失败',
				duration: 3,
			});
		}
		setSubmitting(false);
  }, [formData.selection]);

	const getStyleUrl = async (table: ITable, recordId: string | IRecordType) => {
		const styleFieldId = 'fldNKDQJtZ'
		const styleTbFieldId = 'fldgCE0esc'
		let styleUrls: string | string[] = [];
		const styleField = await table.getField<IAttachmentField>(styleFieldId);
		if (!styleField) {
			Notification.warning({
        content: '没有找到“照片风格”单元格',
        duration: 3,
			})
			return styleUrls;
		}
		if (await styleField.getType() === FieldType.SingleLink) {
			try {
				const linkValue = await styleField.getValue(recordId) as any;
				const styleTable = await bitable.base.getTableById(linkValue?.tableId);
				const peopleField = await styleTable.getField<IAttachmentField>(styleTbFieldId);
				console.log(linkValue.recordIds)
				styleUrls = await peopleField.getAttachmentUrls(linkValue.recordIds[0]);
				if (styleUrls.length === 0) {
					Notification.warning({ 
						content: '没有找到“婚纱风格”相关数据',
						duration: 3,
					})
				}
			} catch (error) {
				console.log('style error---', error)
				Notification.warning({ 
					content: '没有找到“婚纱风格”相关数据',
					duration: 3,
				})
			}
		} else {
			Notification.warning({
        content: '“婚纱风格”单元格类型错误',
        duration: 3,
			})
		}
		return styleUrls
	}

	const getPeopleUrl = async (table: ITable, recordId: string | IRecordType) => {
		const peopleFieldId = 'fldEJHjAkZ'
		const peopleField = await table.getField<IAttachmentField>(peopleFieldId);
		let peopleUrls: string | any[] = []
		if (!peopleField) {
			Notification.warning({
        content: '没有找到“人物照片”单元格',
        duration: 3,
			})
			return peopleUrls
		}
		try {
			peopleUrls = await peopleField.getAttachmentUrls(recordId);
			if (peopleUrls.length === 0) {
				Notification.warning({ 
					content: '没有找到“人物照片”相关数据',
					duration: 3,
				})
			}
		} catch (error) {
			console.log('people error---', error)
			Notification.warning({
				content: '没有找到“人物照片”相关数据',
				duration: 3,
			})
		}
		return peopleUrls
	}
	const formFormDataBySelection = useDebounce( async (selection: any) => {
		// 生成  "fldCeabJmL"
		// 风格  "fldNKDQJtZ"
		// 人物  "fldEJHjAkZ"
		// 风格表附件 "fldgCE0esc"
		// 目标表格 "tblSb2cBOWbKGlmf"
		console.log('submitting--', submitting)
		if (submitting) return;
		const { fieldId, recordId, tableId } = selection || {}
		console.log('selection---', selection)
		// const styleFieldId = 'fldNKDQJtZ'
		// const peopleFieldId = 'fldEJHjAkZ'
		// const styleTbFieldId = 'fldgCE0esc'
    //通过tableId获取table数据表。 Find current table by tableId
		if (tableId !== 'tblSb2cBOWbKGlmf' || !fieldId || !recordId || fieldId !== productFieldId) {
			// Notification.warning({
      //   content: '请选择“生成图池”单元格',
      //   duration: 3,
			// })
			initFormData();
			return;
		}
		const table = await bitable.base.getTableById(tableId);
		const styleUrls = await getStyleUrl(table, recordId);
		if (styleUrls.length === 0)  return
		const peopleUrls = await getPeopleUrl(table, recordId);
		if (styleUrls.length  && peopleUrls.length) {
			console.log('styleUrls[0]--',styleUrls[0])
			console.log('peopleUrls[0]--',peopleUrls[0])
			setFormData({
				source: peopleUrls[0] ,
				target: styleUrls[0],
				selection,
			})
		} else {
			initFormData();
		}
	}, 1000)
	const initFormData = () => {
		setFormData({
			source: '',
			target: '',
			selection: null,
		})
	}
  useEffect(() => {
		const off = bitable.base.onSelectionChange(({ data}) => {
			console.log('current selection', data);
			formFormDataBySelection(data);
		})
		return () => {
			off();
		}
  }, []);

  return (
    <main className="main">
        <Banner 
            type="warning"
            description="1、选择‘生成图池’单元格；2、点击‘立即生成’"
        />
      <Form labelPosition='top' onSubmit={handleGenerate} getFormApi={(baseFormApi: BaseFormApi) => formApi.current = baseFormApi}>
       {
				formData.source ? <Form.Slot label="人物">
						<Image 
								width={80}
								height={80}
								src={formData.source}
						/>
        </Form.Slot> : null
			 }
			  
				{
				formData.target ? <Form.Slot label="风格">
						<Image 
								width={80}
								height={80}
								src={formData.target}
						/>
        </Form.Slot> : null
			 }
			 	<div className="ft-btn"> 
				
					<Button disabled={!formData.source || !formData.target || submitting} theme='solid' htmlType='submit'>
						<div style={{display:'flex', alignItems: 'center', justifyContent: 'center'}}>
			 				{
								submitting ?	<Spin size="small" ></Spin> : null
							}
							立即生成
						</div>
					</Button>
				</div>
      </Form>
    </main>
  )
}