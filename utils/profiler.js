class Profiler {

  start() {
    this.startTime = new Date();
  }

  stop() {
    if (!this.startTime) {
      throw new Error('Unable to stop profiler that haven\'t been started.');
    }

    if (!this.stopTime) {
      this.stopTime = new Date();
    }

    return this.stopTime - this.startTime;
  }

}

module.exports = { Profiler };