import {
    debug,
    host,
    iefix,
    mock,
    version
} from './conf.js'
import {
    addUrlScheme,
    one
} from './tools.js';
// //初始化注册，如页面音频较多可提前调用
// LocalEvent.audioInit({
//     src: that.url,
//     callBack: that.getInitinfo
// });
// //获取音频对象
// LocalEvent.getAudio({
//     src: that.url
// });
// //播放  cb能拿到 
// //音频状态status
// //时长duration
// //当前进度progress
// LocalEvent.playAudio({
//     run: "play",
//     src: that.url,
//     seekTime: that.now,
//     callBack: that.bridgectrl
// });
// //暂停   
// LocalEvent.playAudio({
//     run: "stop",
//     src: that.url,
//     callBack: that.bridgectrl
//   });

const audioCenterConst = {
    StackMaxlength: 50, // 可缓存的audio,length
    audioUseCounter: 'timer', // 内置计数器
    audioStatus: 'status',
    // -1 报错事件
    // 0 默认还未绑定事件
    // 1 已获取播放时长
    // 2 正在下载
    // 3 可以播放
    // 4 已成功被外部调用
    audioDuration: 'audioduration'
};
const audioStatusMap = new Map();
audioStatusMap.set(1, '');

const audioCenter = {
    // 局限，当传入两个相同url文件时只会调用第一个（多播放器绑定到一个音频地址）
    // 未来可考虑用id记录

    audioStack: [], // 缓存audio,好处是初始化时可一次性加载多个音频。
    // 原有在结束或切换时会直接清空，导致重复加载
    audioList: new Map(), // 全页面

    addAudio: function (param) {
        /**
         * [description]
         * @param  {[type]} a [description]
         * @param  {[type]} b [description]
         * @param  {[type]} c [description]
         * @return {[obj]}   [返回新增的audio对象]
         */
        const _src = addUrlScheme(typeof param === 'string' ? param : param.src);
        const hasCache = this.audioStack.find(el => {
            return el.src === _src;
        });
        if (hasCache) {
            // 优先返回缓存
            return hasCache;
        }
        const _audioitem = new Audio();
        _audioitem[audioCenterConst.audioUseCounter] = 0;
        _audioitem[audioCenterConst.audioStatus] = 0;
        _audioitem[audioCenterConst.audioDuration] = null;

        // 偶发 事件多次触发的情况，所以改为仅执行一次；
        one(_audioitem, 'durationchange', function () {
            // 已获取播放时长
            _audioitem[audioCenterConst.audioStatus] = 1;
            _audioitem[audioCenterConst.audioDuration] = parseInt(_audioitem.duration.toFixed(0)) * 1000;
        });
        one(_audioitem, 'progress', function () {
            // 让用户知道媒体文件正在下载
            _audioitem[audioCenterConst.audioStatus] = 2;
        });
        one(_audioitem, 'canplay', function () {
            // 媒体文件可以播放
            _audioitem[audioCenterConst.audioStatus] = 3;
        });
        _audioitem.addEventListener('error', function (e) {
            // 输出错误
            console.log(`audio error
                    src: ${_src},
                    info： ${e},
                    center:${audioCenter}
                    `);
            console.log(_src);
            console.log(e);
            console.log(audioCenter);
            _audioitem[audioCenterConst.audioStatus] = -1;
        });
        _audioitem.src = _src;

        if (this.audioStack.length === audioCenterConst.StackMaxlength) {
            const _lastitem = this.audioStack.pop(); // 拿出上一个
            this.audioStack.sort(function (a, b) {
                return a.paused - b.paused; // 按当前播放状态
                // return a[audioCenterConst.audioUseCounter] - b[audioCenterConst.audioUseCounter] //按使用次数排序
            }).shift().pause(); // 按一定逻辑重排序，并移除最少的,假如在播放，先暂停一下
            this.audioStack.push(_lastitem);
        }

        this.addlist(_src, _audioitem[audioCenterConst.audioStatus]);
        this.audioStack.push(_audioitem);
        return _audioitem;
    },
    addlist: function (src, statusCode = 0) {
        let _map = this.audioList;
        _map.set(src, {
            'timer': _map.get(src) ? _map.get(src).timer++ : 0,
            'status': statusCode
        });
    }
};
// build 应注释
if (debug) {
    window.audioCenter = audioCenter;
}


const checkAudioCache = function (src, pauseOther = false) {
    const _src = addUrlScheme(src);
    const _cacheObj = audioCenter.audioStack.find((el, index) => {
        return el.src === _src;
    });
    if (pauseOther) {
        audioCenter.audioStack.forEach((el) => {
            el.pause();
        });
        // 暂停其他缓存的AUDIO
    }
    return _cacheObj || audioCenter.addAudio(_src);
};
let LocalEvent = {
    audioInit: function (args) {
        // 保证在页面初始化时就推入音频
        // 如在实际播放前，直接playAudio，有概率触发chrome的播放限制报错,极低概率绑定事件很可能不会被监听到
        // 初始化audio时绑一遍，初始化组件时绑一遍，组件方法调用时再绑一遍
        let {
            src,
            callBack
        } = args;
        const audioObj = audioCenter.addAudio(src);
        audioObj.addEventListener('durationchange', function () {
            let callbackData = {
                status: audioObj[audioCenterConst.audioStatus],
                duration: audioObj[audioCenterConst.audioDuration]
            };
            if (callBack) {
                callBack(callbackData);
            }
        });
        audioObj.addEventListener('error', function (msg) {
            let callbackData = {
                status: audioObj[audioCenterConst.audioStatus],
                duration: audioObj[audioCenterConst.audioDuration],
                error: msg
            };
            if (callBack) {
                callBack(callbackData);
            }
        });
        audioObj.addEventListener('progress', function () {
            let callbackData = {
                status: audioObj[audioCenterConst.audioStatus],
                duration: audioObj[audioCenterConst.audioDuration]
            };
            if (callBack) {
                callBack(callbackData);
            }
        });
        audioObj.addEventListener('loadedmetadata', function () {
            let callbackData = {
                status: audioObj[audioCenterConst.audioStatus],
                duration: audioObj[audioCenterConst.audioDuration]
            };
            if (callBack) {
                callBack(callbackData);
            }
        });
    },
    playAudio: function (args) {
        let {
            src,
            run,
            seekTime,
            loop,
            callBack,
            volume
        } = args;
        if (!src || !run || !callBack) {
            console.error('参数错误');
            return false;
        }
        const audioObj = checkAudioCache(src, true);
        if (loop) {
            audioObj.loop = true;
        }
        if (volume) {
            audioObj.volume = volume;
        }
        if (audioObj[audioCenterConst.audioStatus] <= 2) {
            // 返回loading状态
            let callbackData = {
                status: 'loading',
                currentSrc: src,
                progress: 0
            };
            callBack(callbackData);
        }
        // 200603 移出来可以让页面在反复切换一个音频时，多次绑定，旧的callback会将数据返回给已经注销的dom
        // 但这样会出现多次绑定
        audioObj.addEventListener('timeupdate', function () {
            let progress = parseInt(audioObj.currentTime.toFixed(0)) * 1000;
            let callbackData = {
                status: 'playing',
                currentSrc: src,
                progress: progress,
                duration: audioObj[audioCenterConst.audioDuration]
            };
            callBack(callbackData);
        });
        // 防止多次绑定

        if (audioObj[audioCenterConst.audioStatus] < 4) {
            audioObj.addEventListener('progress', function () {
                // 让用户知道媒体文件正在下载
                let callbackData = {
                    status: 'loading',
                    currentSrc: src,
                    progress: 0
                };
                callBack(callbackData);
            });
            audioObj.addEventListener('canplay', function () {
                // 媒体文件可以播放
                let callbackData = {
                    status: 'paused',
                    currentSrc: src,
                    progress: 0,
                    duration: audioObj[audioCenterConst.audioDuration]
                };
                callBack(callbackData);

                // this[audioCenterConst.audioStatus] = 3;
            });
            // audioObj.addEventListener('timeupdate', function() {
            //     let progress = parseInt(audioObj.currentTime.toFixed(0)) * 1000;
            //     let callbackData = {
            //         status: 'playing',
            //         currentSrc: src,
            //         progress: progress,
            //         duration: audioObj[audioCenterConst.audioDuration]
            //     };
            //     callBack(callbackData);
            // });
            audioObj.addEventListener('play', function () {
                let progress = parseInt(audioObj.currentTime.toFixed(0)) * 1000;
                let callbackData = {
                    status: 'playing',
                    currentSrc: src,
                    progress: progress,
                    duration: audioObj[audioCenterConst.audioDuration]
                };

                callBack(callbackData);
            });

            audioObj.addEventListener('ended', function () {
                let callbackData = {
                    status: 'ended',
                    currentSrc: src,
                    progress: audioObj[audioCenterConst.audioDuration],
                    duration: audioObj[audioCenterConst.audioDuration]
                };
                callBack(callbackData);
            });
            audioObj.addEventListener('pause', function () {
                let progress = parseInt(audioObj.currentTime.toFixed(0)) * 1000;
                let callbackData = {
                    status: 'paused',
                    currentSrc: src,
                    progress: progress,
                    duration: audioObj[audioCenterConst.audioDuration]
                };
                callBack(callbackData);
            });

            audioObj[audioCenterConst.audioStatus] = 4; // 初始化完毕
        }
        switch (run) {
            case 'play':
                if (seekTime || seekTime === 0) {
                    audioObj.currentTime = seekTime / 1000;
                }
                // setTimeout(function() {
                audioObj.play();
                // }, 500);

                audioObj[audioCenterConst.audioUseCounter]++;
                // 通知本地
                //bridgeClass.toLocalEvent('H5AudioPlay');
                break;
            case 'pause':
                audioObj.pause();
                break;
        }
    },
    getAudio: function (args) {
        let {
            src
        } = args;
        const hasCache = audioCenter.audioStack.find(el => {
            return el.src === src;
        });
        return hasCache ? hasCache : false;
    },
    setAudio: function (args) {
        let {
            src,
            type,
            val
        } = args;
        const audioObj = audioCenter.addAudio(src);
        audioObj[type] = val;
    },
    clearAudio: function (args) {
        audioCenter.audioStack = [];

    },
    AllH5AudioPause:function () {
        audioCenter.audioStack.forEach((el) => {
            el.pause();
        });
    },
};

window.AllH5AudioPause = function () {
    audioCenter.audioStack.forEach((el) => {
        el.pause();
    });
};

export {
    LocalEvent
};