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
      inputPath: "",
      outputPath: "",
      inputPathSelector: false,
      outputPathSelector: false,
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
      data: {
        ...this.props.config,
        inputPath: this.state.inputPath,
        outputPath: this.state.outputPath
      },
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
      let menuButtons = [];
      menuButtons.push(
        <button className="btn app-menu-btn" onClick={this.props.editConfig} >
          Edit Config
        </button>
      );
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
              {"Lynx 1.0"}
            </div>
          </div>
          <div className="app-body">
            <div className="app-content">
              <div className="app-message">
                {`Customized for ${this.props.config.taskType} using config file ${this.props.configName}.`}
              </div>
              <div className="app-message">
                {`Enter CDrive path to input and output folders and click start.`}
              </div>
              <table className="mx-auto">
                <tr>
                  <td>
                    <input type="text" className="cdrive-path-input my-3 px-3" placeholder="Input folder for profiler" value={this.state.inputPath} onChange={e => this.setState({inputPath: e.target.value})} />
                    <button className="browse-button my-3" onClick={() => this.setState({inputPathSelector: true})}>
                      {"Browse"}
                    </button>
                  </td>
                </tr>
                <tr>
                  <td>
                    <input type="text" className="cdrive-path-input my-3 px-3" placeholder="Output folder for predicted matches" value={this.state.outputPath} onChange={e => this.setState({outputPath: e.target.value})} />
                    <button className="browse-button my-3" onClick={() => this.setState({outputPathSelector: true})}>
                      {"Browse"}
                    </button>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div className="w-100 my-4 text-center">
                      <button className="btn btn-primary btn-lg" style={{width: 200}} onClick={this.executeJob}>
                        Start
                      </button>
                    </div>
                  </td>
                </tr>
              </table>
              <CDrivePathSelector show={this.state.inputPathSelector} toggle={() => this.setState({inputPathSelector : false})}
                action={path => this.setState({inputPath: path})} title="Select Input Folder"  actionName="Select this folder"
                driveObjects={this.state.driveObjects} type="folder" />
              <CDrivePathSelector show={this.state.outputPathSelector} toggle={() => this.setState({outputPathSelector : false})}
                action={path => this.setState({outputPath: path})} title="Select Input Folder"  actionName="Select this folder"
                driveObjects={this.state.driveObjects} type="folder" />
            </div>
          </div>
        </div>
      );
    }
  }
}

export default CreateJob;
