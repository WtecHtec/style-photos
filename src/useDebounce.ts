import { useCallback, useEffect, useRef } from "react";

export function useDebounce(fn: any, time = 1000, fileds = []) {
	const ref = useRef<any>({
		fn,
		timer: null
	})
	useEffect(() => {
		ref.current.fn = fn
	}, [fn])

	return useCallback((...arg: any) => {
		if (ref.current.timer) {
			clearTimeout(ref.current.timer)
		}
		ref.current.timer = setTimeout(() => {
			ref.current.fn(...arg)
		}, time)
	}, [...fileds])
}