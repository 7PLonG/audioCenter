/*
 * @Author: sunyangbo
 * @Date: 2020-06-04 10:40:48
 * @LastEditors: sunyangbo
 * @LastEditTime: 2020-06-04 10:44:56
 * @Description: file content
 */ 
const addUrlScheme = (url,fixstr = '') => {
    const head = window.location.protocol.length > 0 ? window.location.protocol : 'https';
    return url.indexOf('http') > -1 ? url : head +fixstr+ url;
};

const one = function one(elm, event, fn,useCapture = false) {
    function todo(e) {
        fn(e);
        elm.removeEventListener(event, todo,useCapture);
    }
    elm.addEventListener(event, todo ,useCapture);
}

export {
    addUrlScheme,one
}