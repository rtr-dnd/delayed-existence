import React from 'react'
import Obniz from 'obniz'
import { v4 as uuidv4 } from 'uuid'

export default class Layout extends React.Component {
  constructor () {
    super()
    this.obniz = new Obniz('obniz_id_HERE')
    this.servo = undefined
    this.obniz.on('connect', () => {
      const connectedState = 'connected'
      this.obniz.io0.pull('5v')
      this.obniz.io0.output(false)
      this.obniz.io1.pull('5v')
      this.obniz.io1.output(true)
      this.obniz.io10.pull('3v')
      this.obniz.io10.output(false)
      this.setState({ connectedState })
      this.setState({ connectedState })
      this.servo = this.obniz.wired('ServoMotor', { signal: 11 })
    })
    this.obniz.on('close', () => {
      const connectedState = 'false'
      this.setState({ connectedState })
    })
    this.state = {
      obniz: this.obniz,
      connectedState: 'false',
      status: 0, // 0: standby, 1: recording, 2: playing
      recordInterval: undefined,
      playInterval: undefined,
      playIndex: 0,
      servo: this.servo,
      files: [],
      buffer: {}
    }
  }

  record () {
    if (this.state.connectedState !== 'connected') return
    const status = 1
    this.setState({ status })
    const buffer = {
      id: uuidv4(),
      time: Date.now(),
      motor: [],
      laser: []
    }
    this.setState({ buffer })
    const recordIntervalTmp = setInterval(async () => {
      const value = await this.obniz.ad5.getWait()
      const a = -350
      const b = 180
      console.log(Math.log(value + 1) * a + b)
      // a(p-1) = ln(y)
      // p = ln(y)/a + 1
      const on = await this.obniz.io6.inputWait()
      this.setState(prevState => {
        const buffer = Object.assign({}, prevState.buffer)
        buffer.motor.push(value)
        buffer.laser.push(on)
        return { buffer }
      })
      if (this.servo) {
        this.servo.angle(Math.log(value + 1) * a + b)
        // 180 ~ 0
        // this.servo.angle(0)
      }
      if (on) {
        this.obniz.io10.output(true)
      } else {
        this.obniz.io10.output(false)
      }
    }, 150)

    this.setState({ recordInterval: recordIntervalTmp })
  }

  stopRecord () {
    const status = 0
    this.setState({ status })
    const files = [
      ...this.state.files,
      this.state.buffer
    ]
    this.setState({ files })
    clearInterval(this.state.recordInterval)
  }

  play (id) {
    const status = 2
    this.setState({ status })
    const thisFile = this.state.files.find((element) => { return element.id })
    const playIntervalTmp = setInterval(async () => {
      if (this.state.playIndex >= thisFile.length - 1) {
        const status = 0
        this.setState({ status })
        this.setState({ playIndex: 0 })
        clearInterval(this.state.playInterval)
        return
      }
      const value = thisFile.motor[this.state.playIndex]
      const on = thisFile.laser[this.state.playIndex]
      console.log(value)
      if (this.servo) {
        this.servo.angle(Math.log(value + 1) * a + b)
      }
      if (on) {
        this.obniz.io10.output(true)
      } else {
        this.obniz.io10.output(false)
      }
      this.setState({ playIndex: this.state.playIndex + 1 })
    }, 50)
    this.setState({ playInterval: playIntervalTmp })
  }

  stopPlay () {
    const status = 0
    this.setState({ status })
    this.setState({ playIndex: 0 })
    clearInterval(this.state.playInterval)
  }

  render () {
    return (
      <div className="App">
        <h1 className="accent">Delayed Presence</h1>
        obniz state : {this.state.connectedState} <br/>
        status: {this.state.status}
        <br />
        <br />
        <section className="record">
            {
              this.state.status === 1
                ? <button onClick={() => { this.stopRecord() }}>Stop</button>
                : <button className="accent-bg" onClick={() => { this.record() }}>Record</button>
            }
          <p>{this.state.status === 1 ? 'Recording' : 'Not recording'}</p>
        </section>
        <section className="play">
          <h2>Recorded files</h2>
          <div className="files">
            {
              this.state.files.length === 0
                ? <p>No recorded files yet</p>
                : this.state.files.map((item, index) => {
                  return <div className="file" key={item.id}>
                    <span>{
                      new Intl.DateTimeFormat('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric'
                      }).format(item.time)
                      // new Intl.DateTimeFormat('en', { year: 'numeric' }).format(item.time) +
                      // ' ' +
                      // new Intl.DateTimeFormat('en', { month: 'short' }).format(item.time) +
                      // ' ' +
                      // new Intl.DateTimeFormat('en', { day: '2-digit' }).format(item.time) +
                      // ' ' +
                      // new Intl.DateTimeFormat('en', { day: '2-digit' }).format(item.time) +
                      // ' ' +
                      // new Intl.DateTimeFormat('en', { day: '2-digit' }).format(item.time)
                    }</span>
                    {
                      this.state.status === 2
                        ? <button onClick={() => { this.stopPlay(item.id) }}>Stop</button>
                        : <button onClick={() => { this.play(item.id) }}>Play</button>

                    }
                  </div>
                })
            }
          </div>
        </section>
        {/* <div> DisplayPrint : <ObnizDisplayInput obniz={this.obniz} /> </div>
        <div>SwitchState: <ObnizSwitchState obniz={this.obniz} /></div> */}
      </div>
    )
  }
}
