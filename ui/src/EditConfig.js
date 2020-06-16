import React from 'react';
import Cookies from 'universal-cookie';
import axios from 'axios';
import CDrivePathSelector from './CDrivePathSelector';
import './Lynx.css';

const statusKeys = {
  "empty": "Lynx could not find a default config. Import a config or create a new config.",
  "present": "Edit the current config and save it, or cancel to ignore changes",
  "imported": "Config imported. Accept this config or edit and save it"
}

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
      statusKey: ""
    };
    this.getDriveObjects = this.getDriveObjects.bind(this);
    this.saveConfig = this.saveConfig.bind(this);
    this.acceptConfig = this.acceptConfig.bind(this);
    this.importConfig = this.importConfig.bind(this);
  }
  componentDidMount() {
    var statusKey = "present";
    if (this.props.configName === "") {
      statusKey = "empty";
    }
    var newState = {
      ...this.props.config,
      configName: this.props.configName,
      statusKey: statusKey
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
  acceptConfig() {
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
    this.props.updateConfig(config, this.state.configName);
  }
  importConfig(path) {
		const cookies = new Cookies();
    const request = axios({
      method: "GET",
      url: `${this.props.specs.cdriveApiUrl}download?path=${path}`,
      headers: {
        "Authorization": `Bearer ${cookies.get("lynx_token")}`,
      }
    });
    request.then(
      response => {
        const req = axios({
          method: "GET",
          url: response.data.download_url
        });
        req.then(
          res => {
            var newState = res.data;
            newState["configName"] = path.substring(path.lastIndexOf("/") + 1);
            newState["statusKey"] = "imported";
            this.setState(newState);
          },
        );
      },
    );
  }
  render() {
    let actionButtons = [];
    actionButtons.push(
      <button style={{width: 200}} className="btn btn-lg btn-primary mx-3" onClick={this.saveConfig} >
        Save Config
      </button>
    );
    if (this.state.statusKey === "present") {
      actionButtons.push(
        <button style={{width: 200}} className="btn btn-lg btn-secondary mx-3" onClick={this.props.cancelUpdate}>
          Cancel
        </button>
      );
    } else if (this.state.statusKey === "imported") {
      actionButtons.push(
        <button style={{width: 200}} className="btn btn-lg btn-primary mx-3" onClick={this.acceptConfig}>
          Accept Config
        </button>
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
          <div className="app-header-title">
            {"Lynx 1.0"}
          </div>
          <div className="app-menu">
            {menuButtons}
          </div>
        </div>
        <div className="app-body">
          <div className="app-content">
            <div className="m-3 h5 font-weight-normal text-center">
              {statusKeys[this.state.statusKey]}
            </div>
            <div className="mt-4">
              <span className="mx-3 h5">Import Config:</span>
              <button className="btn btn-secondary" onClick={() => this.setState({configSelector: true})}>
                Browse
              </button>
            </div>
            <div className="mt-5 mb-3">
              <span className="mx-3 h5">Or Specify Config:</span>
            </div>
            <table>
              <tr>
                <td>
                  <span className="mx-3">Config Name:</span>
                </td>
                <td>
                  <input type="text" placeholder="Config File Name" value={this.state.configName} className="p-2 mx-3 my-2"
                    onChange={e => this.setState({configName: e.target.value})} />
                </td>
                <td>
                  <span className="mx-3">Task Type:</span>
                </td>
                <td colSpan={3}>
                  <input type="text" placeholder="Task Type" value={this.state.taskType} className="p-2 mx-3 my-2"
                    onChange={e => this.setState({taskType: e.target.value})} />
                </td>
                <td>
                  <span className="mx-3">Learner:</span>
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
                <td />
                <td />
                <td />
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
                <td />
                <td>
                  <span className="m-3">Examples per Iteration:</span>
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
                <td colSpan={10}>
                  <div className="w-100 my-4 text-center">
                    {actionButtons}
                  </div>
                </td>
              </tr>
            </table>
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
