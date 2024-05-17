
const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

function isPromise(obj) {
  return !!(obj && typeof obj === 'object' && typeof obj.then === 'function')
}

function runMicroTask(callback) {
  if (MutationObserver) {
    const ele = document.createElement('p')
    const observer = new MutationObserver(callback)
    observer.observe(ele, {
      childList: true
    })
    ele.innerText = 't'
  } else {
    setTimeout(callback, 0)
  }
}

class MyPromise {
  constructor(executor) {
    this._state = PENDING
    this._value = undefined

    this._handlers = []

    try {
      executor(this._resolve.bind(this), this._reject.bind(this))
    } catch (error) {
      this._reject(error)
    }
  }

  _runHandlers() {
    if (this._state === PENDING) {
      return
    }
    // console.log('length: %o', this._handlers.length, [...this._handlers])
    while(this._handlers[0]) {
      this._runHandler(this._handlers.shift())
    }
  }

  _runHandler(handler) {
    // console.log('this.state: %o,  handler: %o', this.state, handler)

    if (this._state !== handler.state) {
      return
    }
    
    runMicroTask(() => {
      const executor = handler.executor
      const resolve = handler.resolve
      const reject = handler.reject

      // executor不是函数, 那么新的Promise对象的状态和数据要与上一个Promise对象相同
      if (typeof executor !== 'function') {
        this._state === FULFILLED ? resolve(this._value): reject(this._value)
      }
      // 如果是函数, 执行这个函数, 并且处理返回的数据.
      else {
        try {
          const result = executor(this._value)
          if (isPromise(result)) {
            result.then(resolve, reject)
          } else {
            resolve(result)
          }
        } catch(error) {
          reject(error)
        }
      }
    })
  }

  /**
   * 
   * @param { Function } executor MyPromise状态已决时执行的回调函数, onFulfilled或onRejected
   * @param { String } state 表示executor的类型, 如果MyPromise是fulfilled将会执行onFulfilled; 如果MyPromise状态是reject, 将会执行onRejected
   * @param {*} resolve 改变then()返回的MyPromise的状态
   * @param {*} reject 
   */
  _pushHandler(executor, state, resolve, reject) {
    this._handlers.push({
      executor, state, resolve, reject
    })
  }

  then(onFulfilled, onRejected) {
    /*
      then()方法是用于处理任务已决阶段的状态，但是任务什么时候完成或失败，then()方法是不知道的，所以不能直接执行回调函数。
      
      这里的实现是将onFulfilled、onRejected俩个回调函数作为hanlder加入handlers到数组中。handler的执行时机：
      - 回调函数作为hanlder加入到数组后会立即执行，这是因为对应的任务可能已经执行完毕。
      - 任务改变状态时，立即执行。比如任务执行的延时很长，直到执行完毕后改变状态，这是需要立即执行handlers数组。
    */
    return new MyPromise((resolve, reject) => {
      this._pushHandler(onFulfilled, FULFILLED, resolve, reject)
      this._pushHandler(onRejected, REJECTED, resolve, reject)
      this._runHandlers()
    })
  }

  // 只要Promise已决就会运行该回调, 该回调函数不接受任何参数, 没有返回值.
  // finally返回一个新的Promise, 状态和数据与之前的Promise对象一致.
  finally(onSuccess) {
    return this.then((data) => {
      onSuccess()
      return data
    }, reason => {
      onSuccess()
      throw reason
    })
  }

  _changeState(state, data) {
    if (this._state !== PENDING) {
      return;
    }
    this._state = state;
    this._value = data;
    this._runHandlers()
  }

  _resolve(data) {
    this._changeState(FULFILLED, data)
  }

  _reject(reason) {
    this._changeState(REJECTED, reason)
  }

  static resolve(data) {
    if (data instanceof MyPromise) {
      return data
    }
    return new Promise((resolve, reject) => {
      if (isPromise(data)) {
        data.then(resolve, reject)
      } else {
        resolve(data)
      }
    })
  }

  static reject(data) {
    return new MyPromise((resolve, reject) => {
      reject(data)
    })
  }

  /**
   * 
   * 返回一个Promise，当传入的迭代器的所有Promise成功则Promise为成功，任意一个失败则Promise则失败。
   * @param { Iterator } iterator 
   */
  static all(iterator) {
    return new MyPromise((resolve, reject) => {
      try {
        let cnt = 0
        let completedCnt = 0
        const result = []
        for (const promise of iterator) {
          let i = cnt
          cnt++
          MyPromise.resolve(promise).then(data => {
            completedCnt++
            result[i] = data
            if (completedCnt === cnt) {
              resolve(result)
            }
          }, reject)
        }
        if (cnt === 0) {
          return MyPromise.resolve([])
        }
      } catch(error) {
        reject(error)
      }
    })
  }

  static allSetted(iterator) {
    const arr = []
    for (const promise of iterator) {
      arr.push(MyPromise.resolve(promise).then(data => {
        return {
          state: FULFILLED,
          data
        }
      }, reason => {
        return {
          state: REJECTED,
          data: reason
        }
      }))
    }
    return this.all(arr)
  }

  static race(iterator) {
    return new MyPromise((resolve, reject) => {
      for (const promise of iterator) {
        promise(resolve, reject)
      }
      // for (const promise of iterator) {
      //   promise.then(
      //     data => {
      //       if (flag) {
      //         resolve(data)
      //       }
      //       flag = false
      //     },
      //     reason => {
      //       if (flag) {
      //         reject(reason)
      //       }
      //       flag = false
      //     }
      //   )
      // }
    })
    
  }
}

// const pro1 = new MyPromise((resolve, reject) => {
//   setTimeout(() => {
//     resolve('pro1 success')
//   }, 1000)
// })

// const pro2 = new MyPromise((resolve, reject) => {
//   setTimeout(() => {
//     reject('pro2 error')
//   }, 1500)
// })

// MyPromise.race([
//   pro1,
//   pro2,
//   // MyPromise.reject(3),
// ]).then(data => {
//   console.log('succeess: ', data)
// }, reason => {
//   console.log('reason: ', reason)
// })

// const pro1 = new MyPromise((resolve, reject) => {
//   setTimeout(() => {
//     reject('request eerror')
//   }, 1000)
// })

// MyPromise.allSetted([
//   pro1,
//   MyPromise.resolve(1),
//   MyPromise.resolve(2),
//   MyPromise.reject(3),
//   4
// ]).then(data => {
//   console.log('succeess: ', data)
// }, reason => {
//   console.log('failed: ', reason)
// })

// const pro1 = new MyPromise((resolve, reject) => {
//   setTimeout(() => {
//     reject('request eerror')
//   }, 1000)
// })

// MyPromise.all([
//   pro1,
//   MyPromise.resolve(1),
//   MyPromise.resolve(2),
//   MyPromise.reject(3),
//   4
// ]).then(data => {
//   console.log('succeess: ', data)
// }, reason => {
//   console.log('failed: ', reason)
// })


// const pro1 = new MyPromise((resolve, reject) => {
//   setTimeout(() => {
//     reject(2)
//     // resolve(1)
//   }, 1000)
// })

// const pro2 = pro1.finally(() => {
//   console.log('finally')
// })

// setTimeout(() => {
//   console.log(pro2)
// }, 2000)

// function delay(duration) {
//   return new MyPromise((resolve) => {
//     setTimeout(resolve, duration)
//   })
// };

// (async () => {
//   console.log('start')
//   await delay(2000)
//   console.log('end')
// })()

/*
then()
用途: then()用于给Promise对象注册状态变更时要执行的回调函数, 当Promise对象处于已决状态时, 回调函数将会执行.
返回: 返回一个新的Promise对象, 新的Promise对象的状态和数据取决于几种情况:
1. onFulfilled和onRejected的回调函数如果正常执行, 新的Promise状态将是fulfilled, 数据是回调函数返回的数据. 在执行过程中如果报错, Promise对象状态时Reject, 数据是报错的数据.
2. 旧的Promise对象状态变更时所对应的回调函数没有注册, 那么返回的新的Promise对象的状态与数据与旧的Promise对象一致.

这是then()需要实现的逻辑.
*/
