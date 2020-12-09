import React from 'react'
import Obniz from 'obniz'
import { v4 as uuidv4 } from 'uuid'

export default class Layout extends React.Component {
  constructor () {
    super()
    this.obniz = new Obniz('6852-3682')
    this.obniz.on('connect', () => {
      const connectedState = 'connected'
      this.ports = {
        laser: {
          out: this.obniz.io2,
          in: this.obniz.io3
        },
        base: {
          out: undefined,
          in: this.obniz.ad7,
          angleFunc: (value) => {
            return -value * 50 + 230
          }
        },
        shoulder: {
          out: undefined,
          in: this.obniz.ad5,
          angleFunc: (value) => {
            return -value * 50 + 320
          }
        },
        arm: {
          out: undefined,
          in: this.obniz.ad9,
          angleFunc: (value) => {
            return value * 50 + 10
          }
        }
      }
      this.obniz.io0.pull('5v')
      this.obniz.io0.output(false)
      this.obniz.io1.pull('5v')
      this.obniz.io1.output(true)
      this.ports.laser.out.pull('3v')
      this.ports.laser.out.output(false)
      this.setState({ connectedState })
      this.setState({ connectedState })
      this.ports.base.out = this.obniz.wired('ServoMotor', { signal: 6 })
      this.ports.shoulder.out = this.obniz.wired('ServoMotor', { signal: 4 })
      this.ports.arm.out = this.obniz.wired('ServoMotor', { signal: 8 })
    })
    this.obniz.on('close', () => {
      const connectedState = 'false'
      this.setState({ connectedState })
    })
    this.state = {
      obniz: this.obniz,
      connectedState: 'false',
      status: 0, // 0: standby, 1: recording, 2: playing
      nowPlayingId: '',
      recordInterval: undefined,
      playInterval: undefined,
      playIndex: 0,
      // servo: this.servo,
      ports: this.ports,
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
      base: [],
      shoulder: [],
      arm: [],
      laser: []
    }
    this.setState({ buffer })
    const recordIntervalTmp = setInterval(async () => {
      const baseValue = await this.ports.base.in.getWait()
      const shoulderValue = await this.ports.shoulder.in.getWait()
      const armValue = await this.ports.arm.in.getWait()
      const on = await this.ports.laser.in.inputWait()

      this.setState(prevState => {
        const buffer = Object.assign({}, prevState.buffer)
        buffer.base.push(baseValue)
        buffer.shoulder.push(shoulderValue)
        buffer.arm.push(armValue)
        buffer.laser.push(on)
        return { buffer }
      })

      if (this.ports.base.out) {
        this.ports.base.out.angle(this.ports.base.angleFunc(baseValue))
      }
      if (this.ports.shoulder.out) {
        this.ports.shoulder.out.angle(this.ports.shoulder.angleFunc(shoulderValue))
      }
      if (this.ports.arm.out) {
        this.ports.arm.out.angle(this.ports.arm.angleFunc(armValue))
      }
      if (on) {
        this.ports.laser.out.output(true)
      } else {
        this.ports.laser.out.output(false)
      }
    }, 100)

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
    const nowPlayingId = id
    this.setState({ nowPlayingId })
    const thisFile = this.state.files.find((element) => { return element.id === id })
    const playIntervalTmp = setInterval(async () => {
      if (this.state.playIndex >= thisFile.base.length - 1) {
        const status = 0
        this.setState({ status })
        this.setState({ playIndex: 0 })
        clearInterval(this.state.playInterval)
        return
      }

      const baseValue = thisFile.base[this.state.playIndex]
      const shoulderValue = thisFile.shoulder[this.state.playIndex]
      const armValue = thisFile.arm[this.state.playIndex]
      const on = thisFile.laser[this.state.playIndex]

      if (this.ports.base.out) {
        this.ports.base.out.angle(this.ports.base.angleFunc(baseValue))
      }
      if (this.ports.shoulder.out) {
        this.ports.shoulder.out.angle(this.ports.shoulder.angleFunc(shoulderValue))
      }
      if (this.ports.arm.out) {
        this.ports.arm.out.angle(this.ports.arm.angleFunc(armValue))
      }
      if (on) {
        this.ports.laser.out.output(true)
      } else {
        this.ports.laser.out.output(false)
      }
      this.setState({ playIndex: this.state.playIndex + 1 })
    }, 100)
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
                        minute: 'numeric',
                        second: 'numeric'
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
                    {/* <span>{item.id}</span> */}
                    {
                      this.state.status === 2 && this.state.nowPlayingId === item.id
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
