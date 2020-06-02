import React from 'react';
import Cookies from 'universal-cookie';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import CDrivePathSelector from './CDrivePathSelector';
import './Lynx.css';

class EditConfig extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      taskType: "",
      learnerInputs: false,
      configName: "",
      configSelector: false,
      configNameInput: false,
      profilerUrl: "",
      profilerReplicas: "",
      blockerUrl: "",
      blockerReplicas: "",
      blockerChunks: "",
      featurizerUrl: "",
      featurizerReplicas: "",
      featurizerChunks: "",
      iterations: "",
      batchSize: "",
      nEstimators: "",
      minTestSize: "",
      driveObjects: [],
    };
    this.getDriveObjects = this.getDriveObjects.bind(this);
    this.saveConfig = this.saveConfig.bind(this);
    this.importConfig = this.importConfig.bind(this);
  }
  componentDidMount() {
    var newState = {
      ...this.props.config,
      configName: this.props.configName
    };
    this.setState(newState);
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
  saveConfig() {
    var config = {
      taskType: this.state.taskType,
      profilerUrl: this.state.profilerUrl,
      profilerReplicas: this.state.profilerReplicas,
      blockerUrl: this.state.blockerUrl,
      blockerReplicas: this.state.blockerReplicas,
      blockerChunks: this.state.blockerChunks,
      featurizerUrl: this.state.featurizerUrl,
      featurizerReplicas: this.state.featurizerReplicas,
      featurizerChunks: this.state.featurizerChunks,
      iterations: this.state.iterations,
      batchSize: this.state.batchSize,
      nEstimators: this.state.nEstimators,
      minTestSize: this.state.minTestSize,
    };
    const cookies = new Cookies();
    var auth_header = 'Bearer ' + cookies.get('lynx_token');
    const request = axios({
      method: 'POST',
      url: `${this.props.specs.appUrl}api/save-config/`,
      data: {
        config: JSON.stringify(config, undefined, 4),
        configName: this.state.configName
      },
      headers: {'Authorization': auth_header}
    });
    request.then(
      response => {
        this.props.updateConfig(config, this.state.configName);
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
            var newState = res.data;
            newState['configName'] = path.substring(path.lastIndexOf("/") + 1)
            this.setState(newState);
          },
        );
      },
    );
  }
  render() {
    let saveButton, cancelButton;
    saveButton = (
      <button className="btn btn-lg btn-primary mx-3" onClick={() => this.setState({configNameInput: true})} >
        Save Config
      </button>
    );
    if (Object.keys(this.props.config).length === 0) {
      cancelButton = (
        <button className="btn btn-lg btn-secondary mx-3" disabled>
          Cancel
        </button>
      );
    } else {
      cancelButton = (
        <button className="btn btn-lg btn-secondary mx-3" onClick={this.props.cancelUpdate}>
          Cancel
        </button>
      );
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
            </tr>
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
          </table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => this.setState({learnerInputs: false})}>
            Done
          </Button>
        </Modal.Footer>
      </Modal>
    );
    let configNameModal;
    configNameModal = (
      <Modal show={this.state.configNameInput} onHide={() => this.setState({configNameInput:false})}>
        <Modal.Header closeButton>
          <Modal.Title>Enter Config File Name</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ marginTop: "10px" }} className="form-group">
            <input type="text"  className="form-control" value={this.state.configName}
              onChange={e => this.setState({configName: e.target.value})} />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={this.saveConfig}>
            Save Config 
          </Button>
        </Modal.Footer>
      </Modal>
    );
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
            <div className="mt-4">
              <span className="mx-3 h5">Import Config:</span>
              <button className="btn btn-secondary" onClick={() => this.setState({configSelector: true})}>
                Browse
              </button>
              <span className="mx-3">{this.state.configName}</span>
            </div>
            <div className="my-3 h4 text-center">
              OR
            </div>
            <div className="my-3">
              <span className="mx-3 h5">Specify config through UI:</span>
            </div>
            <table>
              <tr>
                <td>
                  <span className="mx-3">Task Type:</span>
                </td>
                <td>
                  <input type="text" placeholder="Task Type" value={this.state.taskType} className="p-2 mx-3 my-2"
                    onChange={e => this.setState({taskType: e.target.value})} />
                </td>
              </tr>
              <tr>
                <td>
                  <span className="mx-3">Profiler:</span>
                </td>
                <td>
                  <input type="text" placeholder="Container URL" value={this.state.profilerUrl} className="p-2 mx-3 my-2"
                    onChange={e => this.setState({profilerUrl: e.target.value})} />
                </td>
                <td>
                  <span className="mx-3">No of Replicas:</span>
                </td>
                <td>
                  <input type="text" value={this.state.profilerReplicas} className="p-1 mx-3 my-2 number-input"
                    onChange={e => this.setState({profilerReplicas: e.target.value})} />
                </td>
              </tr>
              <tr>
                <td>
                  <span className="mx-3">Blocker:</span>
                </td>
                <td>
                  <input type="text" placeholder="Container URL" value={this.state.blockerUrl} className="p-2 mx-3 my-2"
                    onChange={e => this.setState({blockerUrl: e.target.value})} />
                </td>
                <td>
                  <span className="mx-3">No of Replicas:</span>
                </td>
                <td>
                  <input type="text" value={this.state.blockerReplicas} className="p-1 mx-3 my-2 number-input"
                    onChange={e => this.setState({blockerReplicas: e.target.value})} />
                </td>
                <td>
                  <span className="mx-3">Input Chunks:</span>
                </td>
                <td>
                  <input type="text" value={this.state.blockerChunks} className="p-1 mx-3 my-2 number-input" onChange={e => this.setState({blockerChunks: e.target.value})} />
                </td>
              </tr>
              <tr>
                <td>
                  <span className="mx-3">Featurizer:</span>
                </td>
                <td>
                  <input type="text" placeholder="Container URL" value={this.state.featurizerUrl} className="p-2 mx-3 my-2"
                    onChange={e => this.setState({featurizerUrl: e.target.value})} />
                </td>
                <td>
                  <span className="mx-3">No of Replicas:</span>
                </td>
                <td>
                  <input type="text" value={this.state.featurizerReplicas} className="p-1 mx-3 my-2 number-input"
                    onChange={e => this.setState({featurizerReplicas: e.target.value})} />
                </td>
                <td>
                  <span className="mx-3">Input Chunks:</span>
                </td>
                <td>
                  <input type="text" value={this.state.featurizerChunks} className="p-1 mx-3 my-2 number-input" onChange={e => this.setState({featurizerChunks: e.target.value})} />
                </td>
              </tr>
              <tr>
                <td>
                  <span className="mx-3">Learner:</span>
                </td>
                <td>
                  <button className="btn btn-secondary mx-3 my-2" onClick={() => this.setState({learnerInputs: true})}>
                    Configure
                  </button>
                </td>
              </tr>
              <tr>
                <td colSpan={6}>
                  <div className="w-100 my-4 text-center">
                    {saveButton}
                    {cancelButton}
                  </div>
                </td>
              </tr>
            </table>
            {learnerInputsModal}
            {configNameModal}
            <CDrivePathSelector show={this.state.configSelector} toggle={() => this.setState({configSelector: false})}
              action={path => this.importConfig(path)} title="Select Config File"  actionName="Select"
              driveObjects={this.state.driveObjects} type="file" />
          </div>
        </div>
      </div>
    );
  }
}

export default EditConfig;
