import React from 'react';
import Cookies from 'universal-cookie';
import axios from 'axios';
import CDrivePathSelector from './CDrivePathSelector';
import { Redirect } from 'react-router-dom';
import './Lynx.css';

class CreateJob extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      driveObjects: [],
      lakePath: "",
      lakePathSelector: false,
      uid: ""
    };
    this.getDriveObjects = this.getDriveObjects.bind(this);
    this.executeJob = this.executeJob.bind(this);
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
  executeJob() {
    const cookies = new Cookies();
    const request = axios({
      method: 'POST',
      url: `${this.props.specs.appUrl}api/execute-workflow/`,
      data: this.props.config,
      headers: {
        'Authorization': `Bearer ${cookies.get('lynx_token')}`,
      }
    });
    request.then(
      response => {
        this.setState({uid: response.data.uid});
      }, err => {
      }
    );
  }
  render() {
    if (this.state.uid !== "") {
      return <Redirect to={`/job/${this.state.uid}/`} />
    } else {
      return(
        <div className="app-page">
          <div className="app-header">
            {this.props.config.title ? this.props.config.title : "Lynx 1.0: End-to-End Semantic Matching"}
          </div>
          <div className="create-job-container">
            <div className="create-job">
              <input type="text" className="create-text-input" placeholder="Path to Data Lake" value={this.state.lakePath} onChange={e => this.setState({lakePath: e.target.value})} />
              <button className="btn btn-light btn-lg browse-button" onClick={() => this.setState({lakePathSelector: true})}>
                {"..."}
              </button>
              <button className="btn btn-primary btn-lg execute-button" onClick={this.executeJob}>
                Execute
              </button>
            </div>
          </div>
          <CDrivePathSelector show={this.state.lakePathSelector} toggle={() => this.setState({lakePathSelector : false})}
            action={path => this.setState({lakePath: path})} title="Select Data Lake Folder"  actionName="Select this folder"
            driveObjects={this.state.driveObjects} type="folder" />
        </div>
      );
    }
  }
}

export default CreateJob;
