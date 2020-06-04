/*
 * @Author: sunyangbo
 * @Date: 2020-06-04 10:41:11
 * @LastEditors: sunyangbo
 * @LastEditTime: 2020-06-04 10:43:04
 * @Description: file content
 */ 
const env = process.env.NODE_ENV;
const env_p = 'production'; 
let debug = env === env_p?false:true,     // 是否切换host,用环境变量控制
    iefix = false,     // 临时为判断是否为ie添加的。现已关闭
    mock = false,     // 当需要本地mock时，统一开关，逻辑上需要处理好和debug的关系。。
    version = '1.0',
    host;


export {
    debug,
    host,
    iefix,
    mock,
    version,
};
