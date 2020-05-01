import React from 'react';
import Cookies from 'universal-cookie';
import axios from 'axios';
import CDrivePathSelector from './CDrivePathSelector';
import './App.css';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      specs: {},
      isLoggedIn: false,
      inputDir: "",
      inputDirSelector: false,
      outputDir: "",
      outputDirSelector: false,
      profilerUrl: "",
      profilerReplicas: "",
      blockerUrl: "",
      blockerReplicas: "",
      blockerChunks: "",
      featurizerUrl: "",
      featurizerReplicas: "",
      featurizerChunks: "",
      driveObjects: [],
      uid: "",
      fnStatus: "",
      fnMessage: "",
      fnStart: "",
      fnElapsed: "",
      logsAvailable: false,
      logsPage: false,
      completePage: false
    };
    this.getSpecs = this.getSpecs.bind(this);
    this.authenticateUser = this.authenticateUser.bind(this);
    this.getDriveObjects = this.getDriveObjects.bind(this);
    this.startProcessing = this.startProcessing.bind(this);
    this.stopProcessing = this.stopProcessing.bind(this);
    this.pollStatus = this.pollStatus.bind(this);
  }
  getSpecs() {
    const request = axios({
      method: 'GET',
      url: `${window.location.protocol}//${window.location.hostname}${window.location.pathname}api/specs/`
    });
    request.then(
      response => {
        this.setState({specs: response.data});
      },
    );
  }
  authenticateUser() {
    const cookies = new Cookies();
    var accessToken = cookies.get('lynx_token');
    if (accessToken !== undefined) {
      this.getDriveObjects().then(driveObjects => this.setState({driveObjects: driveObjects}));
      this.setState({isLoggedIn: true});
      return;
    }
    var url = new URL(window.location.href);
    var code = url.searchParams.get("code");
    var redirect_uri = `${this.state.specs.cdriveUrl}app/${this.state.specs.username}/lynx/`;
    if (code == null) {
      window.location.href = `${this.state.specs.authUrl}o/authorize/?response_type=code&client_id=${this.state.specs.clientId}&redirect_uri=${redirect_uri}&state=1234xyz`;
    } else {
      const request = axios({
        method: 'POST',
        url: `${redirect_uri}api/access-token/`,
        data: {
          code: code,
          redirect_uri: redirect_uri
        }
      });
      request.then(
        response => {
          cookies.set('lynx_token', response.data.access_token);
          window.location.href = redirect_uri;
        }, err => {
        }
      );
    }
  }
  getDriveObjects() {
    return new Promise(resolve => {
      const cookies = new Cookies();
      var auth_header = 'Bearer ' + cookies.get('lynx_token');
      const request = axios({
        method: 'GET',
        url: this.state.specs.cdriveApiUrl + "list-recursive/?path=users",
        headers: {'Authorization': auth_header}
      });
      request.then(
        response => {
          resolve(response.data.driveObjects);
        }, err => {
          if(err.response.status === 401) {
            cookies.remove('lynx_token');
            window.location.reload(false);
          } else {
            resolve([]);
          }
        }
      );
    });
  }
  startProcessing() {
    this.setState({
      fnStatus: "Running",
      fnMessage: "Processing inputs",
      fnStart: Date.now(),
      fnElapsed: "0s"
    });
    const cookies = new Cookies();
    const request = axios({
      method: 'POST',
      url: `${this.state.specs.cdriveUrl}app/${this.state.specs.username}/lynx/api/execute-workflow/`,
      data: {
        inputDir: this.state.inputDir,
        outputDir: this.state.outputDir,
        profilerUrl: this.state.profilerUrl,
        profilerReplicas: this.state.profilerReplicas,
        blockerUrl: this.state.blockerUrl,
        blockerReplicas: this.state.blockerReplicas,
        blockerChunks: this.state.blockerChunks,
        featurizerUrl: this.state.featurizerUrl,
        featurizerReplicas: this.state.featurizerReplicas,
        featurizerChunks: this.state.featurizerChunks
      },
      headers: {
        'Authorization': `Bearer ${cookies.get('lynx_token')}`,
      }
    });
    request.then(
      response => {
        this.setState({ 
          uid: response.data.uid
        });
        setTimeout(() => this.pollStatus(), 500);
      },
    );
  }
  stopProcessing() {
  }
  pollStatus() {
    const request = axios({
      method: 'GET',
      url: `${this.state.specs.cdriveUrl}app/${this.state.specs.username}/lynx/api/status/?uid=${this.state.uid}`
    });
    request.then(
      response => {
        var elapsedSecs = Math.floor((Date.now()-this.state.fnStart)/1000);
        this.setState({
          fnStatus: response.data.fnStatus,
          fnMessage: response.data.fnMessage,
          fnElapsed: `${Math.floor(elapsedSecs/60)}m ${elapsedSecs % 60}s`
        });
        if (response.data.logsAvailable === "Y") {
          this.setState({logsAvailable:true});
        }
        if(response.data.fnStatus === "Running") {
          setTimeout(() => this.fnStatusPoll(), 1000);
        }
      }, err => {
        setTimeout(() => this.fnStatusPoll(), 1000);
      }
    );
  }
  render() {
    if (Object.keys(this.state.specs).length === 0) {
      this.getSpecs();
      return (null);
    } else if (!this.state.isLoggedIn) {
      this.authenticateUser();
      return (null);
    } else {
      let inputDir, outputDir;
      function getName(cDrivePath) {
        if (cDrivePath === "") {
          return ""
        }
        return cDrivePath.substring(cDrivePath.lastIndexOf("/") + 1);
      }
      inputDir = getName(this.state.inputDir);
      outputDir = getName(this.state.outputDir);
      let blockButton, abortButton;
      if(this.state.fnStatus === "Running") {
        blockButton = (
          <button className="btn btn-lg btn-primary blocker-btn" disabled={true}>
            Execute
          </button>
        );
        abortButton = (
          <button className="btn btn-lg btn-secondary blocker-btn" onClick={this.stopProcessing}>
            Abort
          </button>
        );
      } else {
        blockButton = (
          <button className="btn btn-lg btn-primary blocker-btn" onClick={this.startProcessing}>
            Execute
          </button>
        );
        abortButton = (
          <button className="btn btn-lg btn-secondary blocker-btn" disabled={true}>
            Abort
          </button>
        );
      }
      let statusClasses, actionButton, statusContainer;
      if(this.state.fnStatus !==  "") {
        if(this.state.fnStatus === "Complete") {
          {/*
          actionButton = (
            <button className="btn btn-primary btn-sm ml-2" onClick={() => this.setState({completePage: true})}>
              <span className="h5 font-weight-normal">View Output</span>
            </button>
          );
          */}
          statusClasses = "h5 font-weight-normal";
        } else if(this.state.fnStatus === "Error") {
          {/*
          if (this.state.logsAvailable) {
            actionButton = (
              <button className="btn btn-danger btn-sm ml-2" onClick={() => this.setState({logsPage: true})}>
                <span className="h5 font-weight-normal">View Logs</span>
              </button>
            );
          }
          */}
          statusClasses = "h5 font-weight-normal text-danger";
        } else {
          statusClasses = "h5 font-weight-normal";
        }
        statusContainer = (
          <div className="blocker-status">
            <span className={statusClasses}>{this.state.fnStatus} : {this.state.fnMessage}, Elapsed time: {this.state.fnElapsed}</span>
            {
            //{actionButton}
            }
          </div>
        );
      }
      return(
        <div className="app-container">
          <div className="app-header">
            Lynx
          </div>
          <CDrivePathSelector show={this.state.inputDirSelector} toggle={() => this.setState({inputDirSelector : false})}
          action={path => this.setState({inputDir: path})} title="Select Data Lake Folder"  actionName="Select this folder"
          driveObjects={this.state.driveObjects} type="folder" />
          <CDrivePathSelector show={this.state.outputDirSelector} toggle={() => this.setState({outputDirSelector : false})}
          action={path => this.setState({outputDir: path})} title="Select Output Folder"  actionName="Select this folder"
          driveObjects={this.state.driveObjects} type="folder" />
          <table className="mx-auto">
            <tr>
              <td>
                <span className="m-3">Data Lake Path:</span>
              </td>
              <td>
                <button className="btn btn-secondary m-3" onClick={() => this.setState({inputDirSelector : true})} >
                  Browse
                </button>
                <span className="m-3">{inputDir}</span>
              </td>
              <td>
                <span className="m-3">Output Folder:</span>
              </td>
              <td>
                <button className="btn btn-secondary m-3" onClick={() => this.setState({outputDirSelector : true})} >
                  Browse
                </button>
                <span className="m-3">{outputDir}</span>
              </td>
            </tr>
            <tr>
              <td>
                <span className="m-3">Profiler:</span>
              </td>
              <td>
                <input type="text" placeholder="Container URL" value={this.state.profilerUrl} className="p-2 m-3 cdrive-input-item"
                  onChange={e => this.setState({profilerUrl: e.target.value})} />
              </td>
              <td>
                <span className="m-3">No of Replicas:</span>
              </td>
              <td>
                <input type="text" value={this.state.profilerReplicas} className="p-1 m-3 number-input"
                  onChange={e => this.setState({profilerReplicas: e.target.value})} />
              </td>
            </tr>
            <tr>
              <td>
                <span className="m-3">Blocker:</span>
              </td>
              <td>
                <input type="text" placeholder="Container URL" value={this.state.blockerUrl} className="p-2 m-3 cdrive-input-item"
                  onChange={e => this.setState({blockerUrl: e.target.value})} />
              </td>
              <td>
                <span className="m-3">No of Replicas:</span>
              </td>
              <td>
                <input type="text" value={this.state.blockerReplicas} className="p-1 m-3 number-input"
                  onChange={e => this.setState({blockerReplicas: e.target.value})} />
              </td>
              <td>
                <span className="m-3">Input Chunks:</span>
              </td>
              <td>
                <input type="text" value={this.state.blockerChunks} className="p-1 m-3 number-input" onChange={e => this.setState({blockerChunks: e.target.value})} />
              </td>
            </tr>
            <tr>
              <td>
                <span className="m-3">Featurizer:</span>
              </td>
              <td>
                <input type="text" placeholder="Container URL" value={this.state.featurizerUrl} className="p-2 m-3 cdrive-input-item"
                  onChange={e => this.setState({featurizerUrl: e.target.value})} />
              </td>
              <td>
                <span className="m-3">No of Replicas:</span>
              </td>
              <td>
                <input type="text" value={this.state.featurizerReplicas} className="p-1 m-3 number-input"
                  onChange={e => this.setState({featurizerReplicas: e.target.value})} />
              </td>
              <td>
                <span className="m-3">Input Chunks:</span>
              </td>
              <td>
                <input type="text" value={this.state.featurizerChunks} className="p-1 m-3 number-input" onChange={e => this.setState({featurizeChunks: e.target.value})} />
              </td>
            </tr>
            <tr>
              <td colSpan={6}>
                <div className="input-div text-center">
                  {blockButton}
                  {abortButton}
                </div>
              </td>
            </tr>
          </table>
          {statusContainer}
        </div>
      );
    }
  }
}

export default App;
