import React from 'react';
import Cookies from 'universal-cookie';
import axios from 'axios';
import { Link } from 'react-router-dom';
import CDrivePathSelector from './CDrivePathSelector';
import './Lynx.css';

class JobStatus extends React.Component{
  constructor(props) {
    super(props);
    this.state = {
      job: null,
      actionMessage: "",
      pathSelector: false,
      pathSelectAction: null,
      driveObjects: []
    };
    this.pollStatus = this.pollStatus.bind(this);
    this.saveModel = this.saveModel.bind(this);
    this.applyModel = this.applyModel.bind(this);
    this.getDriveObjects = this.getDriveObjects.bind(this);
  }
  componentDidMount() {
    this.getDriveObjects();
  }
  getDriveObjects() {
    if(!this.props.specs) {
      return(null);
    }
    const cookies = new Cookies();
    var auth_header = 'Bearer ' + cookies.get('lynx_token');
    const request = axios({
      method: 'GET',
      url: this.props.specs.cdriveApiUrl + "list-recursive/?path=users",
      headers: {'Authorization': auth_header}
    });
    request.then(
      response => {
        this.setState({
          driveObjects: response.data.driveObjects,
        });
      }, err => {
        if(err.response.status === 401) {
          cookies.remove('lynx_token');
          window.location.reload(false);
        } else {
        }
      }
    ); 
  }
  pollStatus() {
    const request = axios({
      method: 'GET',
      url: `${this.props.specs.cdriveUrl}app/${this.props.specs.username}/lynx/api/status/?uid=${this.props.match.params.uid}`
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
  saveModel(path) {
    const cookies = new Cookies();
    const request = axios({
      method: 'POST',
      url: `${this.props.specs.cdriveUrl}/app/${this.props.specs.username}/lynx/api/save-model/`,
      data: {
        uid: this.state.job.uid,
        path: path
      },
      headers: {
        'Authorization': `Bearer ${cookies.get('lynx_token')}`,
      }
    });
    request.then(
      response => {
        this.setState({actionMessage: "Learning Model saved to CDrive!"});
      },
    );

  }
  applyModel(path) {
    const cookies = new Cookies();
    const request = axios({
      method: 'POST',
      url: `${this.props.specs.cdriveUrl}/app/${this.props.specs.username}/lynx/api/apply-model/`,
      data: {
        uid: this.state.job.uid,
        path: path
      },
      headers: {
        'Authorization': `Bearer ${cookies.get('lynx_token')}`,
      }
    });
    request.then(
      response => {
        this.setState({actionMessage: "Predictions saved to CDrive!"});
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
          <a className="btn btn-primary btn-lg mx-3" href={this.state.job.labeling_url}>
            Start Labeling
          </a>
        );
      } else if (this.state.job.status === "Running") {
        actions.push(
          <Link className="btn btn-secondary btn-lg mx-3" to="/">
            Cancel
          </Link>
        );
      } else if (this.state.job.status === "Complete" || this.state.job.status === "Error") {
        actions.push(
          <a className="btn btn-primary btn-lg mx-3" href={this.props.specs.appUrl}>
            Finish
          </a>
        );
      }
      let saveStatus;
      if (this.state.actionMessage !== "") {
        saveStatus = (
          <div className="input-div">
            <span className="mx-2 h5 font-weight-normal">{this.state.actionMessage}</span>
            <a className="btn ml-3 btn-primary" href={this.props.specs.cdriveUrl} >
              View {"in"} CDrive
            </a>
          </div>
        );
      }
      let cdrivePathSelector;
      if (this.state.pathSelector) {
        cdrivePathSelector = (
          <CDrivePathSelector show={this.state.pathSelector} toggle={() => this.setState({pathSelector: false})} 
            action={path => this.state.pathSelectAction(path)} title="Select CDrive Location" 
            actionName="Select this folder" driveObjects={this.state.driveObjects} type="folder" />
        );
      }
      let menuButtons = [];
      menuButtons.push(
        <button className="btn app-menu-btn">
          Manual Mode
        </button>
      );
      menuButtons.push(
        <a href={this.props.specs.cdriveUrl} className="btn app-menu-btn">
          Quit
        </a>
      );
      return(
        <div className="app-page">
          <div className="app-header">
            <div className="app-menu">
              {menuButtons}
            </div>
            <div className="app-header-title">
              {"Lynx 1.0: End-to-End Semantic Matching"}
            </div>
          </div>
          <div className="app-body">
            <div className="app-content">
              <div className="my-5 h3 text-center">
                Lynx Task Status
              </div>
              <div className="my-4" style={{width: 700}}>
                <span className="mx-2 h5 font-weight-normal">Stage: {this.state.job.stage}</span>
              </div>
              <div className="my-4" style={{width: 700}}>
                <span className="mx-2 h5 font-weight-normal">Status: {this.state.job.long_status}</span>
              </div>
              <div className="my-5 text-center">
                {actions}
              </div>
              {saveStatus}
              {cdrivePathSelector}
            </div>
          </div>
        </div>
      );
    }
  }
}

export default JobStatus;
