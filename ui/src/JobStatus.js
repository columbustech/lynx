import React from 'react';
import Cookies from 'universal-cookie';
import axios from 'axios';
import './Lynx.css';

class JobStatus extends React.Component{
  constructor(props) {
    super(props);
    this.state = {
      job: null,
      saved: false
    };
    this.pollStatus = this.pollStatus.bind(this);
    this.saveModel = this.saveModel.bind(this);
  }
  pollStatus() {
    const request = axios({
      method: 'GET',
      url: `${this.props.specs.cdriveUrl}app/${this.props.specs.username}/lynx/api/status/?uid=${this.props.uid}`
    });
    request.then(
      response => {
        if (response.data.status === "Running") {
          setTimeout(() => this.pollStatus(), 1000);
        }
        this.setState({
          job: response.data
        });
      },
    );
  }
  saveModel() {
    const cookies = new Cookies();
    const request = axios({
      method: 'POST',
      url: `${this.props.specs.cdriveUrl}/app/${this.props.specs.username}/lynx/api/save-model/`,
      data: {
        uid: this.state.job.uid,
      },
      headers: {
        'Authorization': `Bearer ${cookies.get('lynx_token')}`,
      }
    });
    request.then(
      response => {
        this.setState({saved: true});
      },
    );

  }
  render() {
    if (!this.state.job) {
      this.pollStatus();
      return(null);
    } else {
      let actions;
      actions = [];
      if(this.state.job.status === "Ready") {
        actions.push(
          <a className="btn btn-primary btn-lg blocker-btn" href={this.state.job.labeling_url}>
            Start Labeling
          </a>
        );
        actions.push(
          <button className="btn btn-secondary btn-lg blocker-btn" onClick={this.saveModel}>
            Save Model
          </button>
        );
        actions.push(
          <button className="btn btn-secondary btn-lg blocker-btn" >
            Apply Model
          </button>
        );
      } else if (this.state.job.status === "Complete") {
        actions.push(
          <button className="btn btn-primary btn-lg blocker-btn" onClick={this.saveModel}>
            Save Model
          </button>
        );
        actions.push(
          <button className="btn btn-secondary btn-lg blocker-btn" >
            Apply Model
          </button>
        );
      }
      actions.push(
        <a className="btn btn-secondary btn-lg blocker-btn" href={`${this.props.specs.cdriveUrl}app/${this.props.specs.username}/lynx/`}>
          Home
        </a>
      );
      let saveStatus;
      if (this.state.saved) {
        saveStatus = (
          <div className="input-div">
            <span className="mx-2 h5 font-weight-normal">Model saved to CDrive output path!</span>
          </div>
        );
      }
      return(
        <div className="app-container">
          <div className="app-header">
            Job Name: {this.state.job.job_name}
          </div>
          <div className="input-div" style={{marginTop: 30}}>
            <span className="mx-2 h5 font-weight-normal">Stage: {this.state.job.stage}</span>
          </div>
          <div className="input-div">
            <span className="mx-2 h5 font-weight-normal">Status: {this.state.job.long_status}</span>
          </div>
          <div className="input-div text-center">
            {actions}
          </div>
          {saveStatus}
        </div>
      );
    }
  }
}

export default JobStatus;
