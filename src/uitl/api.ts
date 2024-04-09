import { bitable } from '@lark-base-open/js-sdk';
import axios from 'axios';
const API_BASE_URL = 'https://stylephotoserver.zeabur.app';
axios.defaults.withCredentials = true; 
const getConfig = async () => {
	const userid = await bitable.bridge.getUserId();
	const cacheDatas: any = await bitable.bridge.getData('authorization');
	const config = {
		withCredentials: true,
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			authorization: `auth ${cacheDatas}`,
			authuseid: userid,
		}
	};
	return config;
}

export const getApiTaskDetails = async (taskId: string) => {
	try {
		const config = await getConfig();
		const response = await axios.get(`${API_BASE_URL}/photo/task/${taskId}`, config)
		return ['', response.data];
	} catch (error) {
		return [error, ''];
	}
}


export const postApiAuth = async () => {
	const userid = await bitable.bridge.getUserId();
	const config = {
		withCredentials: true,
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		}
	};
	try {
		const response = await axios.post(`${API_BASE_URL}/auth`, { userid }, config);
		return ['', response.data];
	} catch (error) {
		return [error, ''];
	}
}

export const getApiStyles = async () => {
	try {
		const config = await getConfig();
		const response = await axios.get(`${API_BASE_URL}/styles`, config)
		return ['', response.data];
	} catch (error) {
		return [error, ''];
	}
}



export const postApiPhoto = async (sourceurl: string, targeturl:string) => {
	const config = await getConfig();
	try {
		const response = await axios.post(`${API_BASE_URL}/photo`, 
			{ sourceurl: encodeURIComponent(sourceurl), 
				targeturl: encodeURIComponent(targeturl) }, config);
		return ['', response.data];
	} catch (error) {
		return [error, ''];
	}
}













