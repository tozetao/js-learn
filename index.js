function move(dom, options, completed) {
  clearInterval(dom.timer)

  dom.timer = setInterval(function() {
    let current = 0;
    for (let attr in options) {
      let target = options[attr];

      if ('opacity' == attr) {
        current = parseFloat(getStyle(dom, attr)) * 100;
      } else {
        current = parseFloat(getStyle(dom, attr));
      }
      
      let speed = (target - current) / 8;
      speed = speed > 0 ? Math.ceil(speed) : Math.floor(speed)

      if (current == target) {
        clearInterval(dom.timer);
        typeof completed === 'function' && completed()
      } else {
        if ('opacity' == attr) {
          dom.style[attr] = (current + speed) / 100;
        } else {
          dom.style[attr] = (current + speed) + 'px';
        }
      }
    }
  }, 30)
}

function createAnimation(options) {
  var from = options.from
  var to = options.to

  var totalDuration = options.totalDuration || 500
  var duration = options.duration || 20

  var times = totalDuration / duration
  var dis = (to - from) / times
  var cnt = 0

  // console.log(totalDuration, times, dis)

  var timer = setInterval(function() {
    cnt++
    from += dis
    
    if (cnt >= times) {
      from = to
      clearInterval(timer)
      timer = null
      options.onCompleted && options.onCompleted()
    }

    options.onChange && options.onChange(from)
  }, duration)
}

function $(selectors) {
  return document.querySelector(selectors)
}

function $$(selectors) {
  return document.querySelectorAll(selectors)
}

function getStyle(dom, attr) {
  if (window.getComputedStyle) {
    return window.getComputedStyle(dom, null)[attr]
  }
  return dom.currentStyle[attr]
}

function getCharts() {
  return {
    chart: null,
    init(id) {
      this.chart = echarts.init(document.getElementById(id));
      var xMin = -300
      var xMax = 300
      var xInterval = (xMax - xMin) / 40
      
      var yMin = -100
      var yMax = 100
      var yInterval = (yMax - yMin) / 40
      
      var option = {
        xAxis: {
          type: 'value',
          name: 'x',
          min: xMin,
          max: xMax,
          interval: xInterval
        },
        yAxis: {
          type: 'value',
          name: 'x',
          min: yMin,
          max: yMax,
          interval: yInterval
        },
        dataset: {
          source: []
        },
        series: [
          {
            name: 'y=x/k',
            type: 'line',
            smooth: true
          }
        ]
      }
      this.chart.setOption(option)
    },
    setDataSource(source) {
      this.chart.setOption({
        dataset: {
          source: [...source]
        }
      })
    }
  }
}