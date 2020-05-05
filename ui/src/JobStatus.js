import React from 'react';
import Cookies from 'universal-cookie';
import axios from 'axios';
import './App.css';

class JobStatus extends React.Component{
  constructor(props) {
    super(props);
    this.state = {
      jobStatus: "",
      longStatus: "",
    };
    this.pollStatus = this.pollStatus.bind(this);
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
        } else if (response.data.status === "Ready") {
        } else if (response.data.status === "Complete") {
        }
        this.setState({
          jobStatus: response.data.status,
          longStatus: response.data.long_status
        });
      },
    );
  }
  render() {
    if (this.state.jobStatus === "") {
      this.pollStatus();
      return(null);
    } else if (this.state.jobStatus === "Running") {
      return(null);
    } else if (this.state.jobStatus === "Ready") {
      return(
        <div className="app-container">
          <div className="app-header">
            Iteration Complete
          </div>
          <div className="input-div">
            <span className="mx-2">Label examples {"for"} next iteration</span>
          </div>
          <div className="input-div text-center">
            <a className="btn btn-primary btn-lg blocker-btn" href={this.state.longStatus}>
              Start
            </a>
            <button className="btn btn-secondary btn-lg blocker-btn" >
              Download Model
            </button>
          </div>
        </div>
      );
    } else if (this.state.jobStatus === "Complete") {
      return (null);
    }
  }
}

export default JobStatus;
