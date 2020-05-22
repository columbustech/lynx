import React from 'react';
import Cookies from 'universal-cookie';
import axios from 'axios';
import Table from 'react-bootstrap/Table';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import './Lynx.css';

class EditConfig extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
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
  getDriveObjects() {
  }
  startProcessing() {
  }
  importConfig() {
  }
  render() {
    let execButton, cancelButton;
    execButton = (
      <button className="btn btn-lg btn-primary blocker-btn" onClick={this.startProcessing}>
        Execute
      </button>
    );
    cancelButton = (
      <a className="btn btn-lg btn-secondary blocker-btn" href={this.props.specs.appUrl}>
        Cancel
      </a>
    );
    
    return(
      <div className="edit-config-container">
        <div className="edit-config">
          <div>
            <span className="m-3 h5">Import Config:</span>
            <button className="btn btn-secondary">
              Browse
            </button>
          </div>
          <div className="app-header">
            OR
          </div>
          <div className="mb-4">
            <span className="m-3 h5">Input config through UI:</span>
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
                  {execButton}
                  {cancelButton}
                </div>
              </td>
            </tr>
          </table>
        </div>
      </div>
    );
  }
}

class CreateJob extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      driveObjects: "",
      lakePath: "",
      title: "Lynx 1.0: End-to-End Semantic Matching",
      profilerUrl: "",
      profilerReplicas: "",
      blockerUrl: "",
      blockerReplicas: "",
      blockerChunks: "",
      featurizerUrl: "",
      featurizerReplicas: "",
      featurizerChunks: "",
      iterations: "",
      minTestSize: "",
      nEstimators: "",
      batchSize: ""
    };
  }
  componentDidMount() {
    this.setState(this.props.config);
  }
  render() {
    return(
      <div className="app-page">
        <div className="app-header">
          {this.state.title}
        </div>
        <div className="create-job-container">
          <div className="create-job">
            <input type="text" className="create-text-input" placeholder="Path to Data Lake" />
            <button className="btn btn-secondary btn-lg browse-button" type="button">Browse</button>
            <button className="btn btn-primary btn-lg execute-button" type="button">Execute</button>
          </div>
        </div>
      </div>
    );
  }
}

class Home extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      component: CreateJob,
      pageReady: false
    };
  }
  componentDidMount() {
    if (Object.keys(this.props.config).length === 0) {
      this.setState({
        pageReady: true,
        component: <EditConfig specs={this.props.specs}/>
      });
    } else {
      this.setState({
        pageReady: true,
        component: <CreateJob config={this.props.config} />
      });
    }
  }
  render() {
    if (this.state.pageReady) {
      return this.state.component;
    } else {
      return (null);
    }
  }
}

export default Home;
