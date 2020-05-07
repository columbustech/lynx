import React from 'react';
import Cookies from 'universal-cookie';
import axios from 'axios';
import CDrivePathSelector from './CDrivePathSelector';
import { Modal, Button } from 'react-bootstrap';
import './Lynx.css';

class CreateJob extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      jobName: "",
      inputMode: "ui",
      configFilePath: "",
      configFilePathSelector: false,
      learnerInputs: false,
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
      seedPath: "",
      iterations: "",
      batchSize: "",
      nEstimators: "",
      minTestSize: "",
      driveObjects: [],
    };
    this.getDriveObjects = this.getDriveObjects.bind(this);
    this.startProcessing = this.startProcessing.bind(this);
    this.importConfig = this.importConfig.bind(this);
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
  startProcessing() {
    const cookies = new Cookies();
    const request = axios({
      method: 'POST',
      url: `${this.props.specs.cdriveUrl}app/${this.props.specs.username}/lynx/api/execute-workflow/`,
      data: {
        jobName: this.state.jobName,
        inputDir: this.state.inputDir,
        outputDir: this.state.outputDir,
        profilerUrl: this.state.profilerUrl,
        profilerReplicas: this.state.profilerReplicas,
        blockerUrl: this.state.blockerUrl,
        blockerReplicas: this.state.blockerReplicas,
        blockerChunks: this.state.blockerChunks,
        featurizerUrl: this.state.featurizerUrl,
        featurizerReplicas: this.state.featurizerReplicas,
        featurizerChunks: this.state.featurizerChunks,
        seedPath: this.state.seedPath,
        iterations: this.state.iterations,
        batchSize: this.state.batchSize,
        nEstimators: this.state.nEstimators,
        minTestSize: this.state.minTestSize
      },
      headers: {
        'Authorization': `Bearer ${cookies.get('lynx_token')}`,
      }
    });
    request.then(
      response => {
        window.location.href = `${this.props.specs.cdriveUrl}app/${this.props.specs.username}/lynx/job/${response.data.uid}`;
      },
    );
  }
  importConfig(path) {
    const cookies = new Cookies();
    const request = axios({
      method: 'GET',
      url: `${this.props.specs.cdriveApiUrl}download?path=${path}`,
      headers: {
        'Authorization': `Bearer ${cookies.get('lynx_token')}`,
      }
    });
    request.then(
      response => {
        const req = axios({
          method: 'GET',
          url: response.data.download_url
        });
        req.then(
          res => {
            var newState = {
              configFilePath: path,
              ...res.data
            };
            this.setState(newState);
          },
          err => {
          }
        );
      }, err => {
      }
    );
  }
  render() {
    let inputDir, outputDir;
    function getName(cDrivePath) {
      if (cDrivePath === "") {
        return ""
      }
      return cDrivePath.substring(cDrivePath.lastIndexOf("/") + 1);
    }
    inputDir = getName(this.state.inputDir);
    outputDir = getName(this.state.outputDir);
    let execButton, homeButton;
    execButton = (
      <button className="btn btn-lg btn-primary blocker-btn" onClick={this.startProcessing}>
        Execute
      </button>
    );
    homeButton = (
      <a className="btn btn-lg btn-secondary blocker-btn" href={`${this.props.specs.cdriveUrl}app/${this.props.specs.username}/lynx/`}>
        Home
      </a>
    );
    let inputModeRow, configFileName;
    configFileName = getName(this.state.configFilePath);
    if(this.state.inputMode === "ui") {
      inputModeRow = (
        <tr>
          <td>
            <span className="m-3">Job Name:</span>
          </td>
          <td>
            <input type="text" placeholder="Job Name" value={this.state.jobName} className="p-2 m-3 cdrive-input-item"
              onChange={e => this.setState({jobName: e.target.value})} />
          </td>
          <td>
            <span className="m-3">Input Mode:</span>
          </td>
          <td colSpan={3}>
            <div className="btn-group m-3" role="group">
              <button className="btn btn-primary">User Interface</button>
              <button className="btn btn-light" onClick={()=>this.setState({inputMode:"json"})}>Import</button>
            </div>
          </td>
        </tr>
      );
    } else if (this.state.inputMode === "json"){
      inputModeRow = (
        <tr>
          <td>
            <span className="m-3">Job Name:</span>
          </td>
          <td>
            <input type="text" placeholder="Job Name" value={this.state.jobName} className="p-2 m-3 cdrive-input-item"
              onChange={e => this.setState({jobName: e.target.value})} />
          </td>
          <td>
            <span className="m-3">Input Mode:</span>
          </td>
          <td colSpan={3}>
            <div className="btn-group m-3" role="group">
              <button className="btn btn-light" onClick={()=>this.setState({inputMode:"ui"})}>User Interface</button>
              <button className="btn btn-primary">Import</button>
            </div>
          </td>
          <td>
            <span className="m-3">Config File:</span>
          </td>
          <td >
            <button className="btn btn-secondary m-3" onClick={() => this.setState({configFilePathSelector : true})} >
              Browse
            </button>
            <span className="m-3">{configFileName}</span>
          </td>
        </tr>
      )
    }
    let learnerInputsModal;
    learnerInputsModal = (
      <Modal show={this.state.learnerInputs} onHide={() => this.setState({learnerInputs: false})}>
        <Modal.Header closeButton>
          <Modal.Title>Configure Active Learning Model</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <table className="mx-auto">
            <tr>
              <td>
                <span className="m-3">Seed Path:</span>
              </td>
              <td colSpan={3}>
                <input type="text" placeholder="Seed examples path" value={this.state.seedPath} className="p-2 m-3 cdrive-input-item"
                  onChange={e => this.setState({seedPath: e.target.value})} />
              </td>
            </tr>
              <td>
                <span className="m-3">No. of Trees:</span>
              </td>
              <td>
                <input type="text" value={this.state.nEstimators} className="p-1 m-3 number-input"
                  onChange={e => this.setState({nEstimators: e.target.value})} />
              </td>
              <td>
                <span className="m-3">No. of Iterations:</span>
              </td>
              <td>
                <input type="text" value={this.state.iterations} className="p-1 m-3 number-input"
                  onChange={e => this.setState({iterations: e.target.value})} />
              </td>
            <tr>
              <td>
                <span className="m-3">Batch Size:</span>
              </td>
              <td>
                <input type="text" value={this.state.batchSize} className="p-1 m-3 number-input"
                  onChange={e => this.setState({batchSize: e.target.value})} />
              </td>
              <td>
                <span className="m-3">Min Test Size:</span>
              </td>
              <td>
                <input type="text" value={this.state.minTestSize} className="p-1 m-3 number-input"
                  onChange={e => this.setState({minTestSize: e.target.value})} />
              </td>
            </tr>
            <tr>
            </tr>
          </table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => this.setState({learnerInputs: false})}>
            Done
          </Button>
        </Modal.Footer>
      </Modal>
    );
    return(
      <div className="app-container">
        <div className="app-header">
          Create Job
        </div>
        <CDrivePathSelector show={this.state.inputDirSelector} toggle={() => this.setState({inputDirSelector : false})}
        action={path => this.setState({inputDir: path})} title="Select Data Lake Folder"  actionName="Select this folder"
        driveObjects={this.state.driveObjects} type="folder" />
        <CDrivePathSelector show={this.state.outputDirSelector} toggle={() => this.setState({outputDirSelector : false})}
        action={path => this.setState({outputDir: path})} title="Select Output Folder"  actionName="Select this folder"
        driveObjects={this.state.driveObjects} type="folder" />
        <CDrivePathSelector show={this.state.configFilePathSelector} toggle={() => this.setState({configFilePathSelector: false})}
        action={path => this.importConfig(path)} title="Select Config File"  actionName="Select"
        driveObjects={this.state.driveObjects} type="file" />
        {learnerInputsModal}
        <table className="mx-auto">
          {inputModeRow}
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
            <td colSpan={3}>
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
              <input type="text" value={this.state.featurizerChunks} className="p-1 m-3 number-input" onChange={e => this.setState({featurizerChunks: e.target.value})} />
            </td>
          </tr>
          <tr>
            <td>
              <span className="m-3">Learner:</span>
            </td>
            <td>
              <button className="btn btn-secondary m-3" onClick={() => this.setState({learnerInputs: true})}>
                Configure
              </button>
            </td>
            <td />
            <td />
            <td />
            <td />
          </tr>
          <tr>
            <td colSpan={8}>
              <div className="input-div text-center">
                {execButton}
                {homeButton}
              </div>
            </td>
          </tr>
        </table>
      </div>
    );
  }
}

export default CreateJob;
