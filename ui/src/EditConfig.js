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
      learnerInputs: false,
      configSelector: false,
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
    this.setState({config: this.props.config});
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
      data: {config: JSON.stringify(config, undefined, 4)},
      headers: {'Authorization': auth_header}
    });
    request.then(
      response => {
        this.props.updateConfig(config);
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
            this.setState(res.data);
          },
        );
      },
    );
  }
  render() {
    let saveButton, cancelButton;
    saveButton = (
      <button className="btn btn-lg btn-primary blocker-btn" onClick={this.saveConfig}>
        Save Config
      </button>
    );
    cancelButton = (
      <button className="btn btn-lg btn-secondary blocker-btn" onClick={this.props.cancelUpdate}>
        Cancel
      </button>
    );
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
    
    return(
      <div className="edit-config-container">
        <div className="edit-config">
          <div>
            <span className="m-3 h5">Import Config:</span>
            <button className="btn btn-secondary" onClick={() => this.setState({configSelector: true})}>
              Browse
            </button>
          </div>
          <div className="app-header">
            OR
          </div>
          <div className="mb-4">
            <span className="m-3 h5">Specify config through UI:</span>
          </div>
          <table>
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
            </tr>
            <tr>
              <td colSpan={6}>
                <div className="input-div text-center">
                  {saveButton}
                  {cancelButton}
                </div>
              </td>
            </tr>
          </table>
        </div>
        {learnerInputsModal}
        <CDrivePathSelector show={this.state.configSelector} toggle={() => this.setState({configSelector: false})}
        action={path => this.importConfig(path)} title="Select Config File"  actionName="Select"
        driveObjects={this.state.driveObjects} type="file" />
      </div>
    );
  }
}

export default EditConfig;
