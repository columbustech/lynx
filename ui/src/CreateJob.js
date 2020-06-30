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
      step: 1,
      parameters: [],
      driveObjects: [],
      inputPath: "",
      outputPath: "",
      paramsPath: "",
      inputPathSelector: false,
      outputPathSelector: false,
      paramsPathSelector: false,
      uid: ""
    };
    this.getDriveObjects = this.getDriveObjects.bind(this);
    this.executeJob = this.executeJob.bind(this);
    this.findParamFile = this.findParamFile.bind(this);
    this.fetchParameters = this.fetchParameters.bind(this);
    this.updateParameter = this.updateParameter.bind(this);
  }
  componentDidMount() {
    this.getDriveObjects();
    this.findParamFile();
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
  findParamFile() {
		if(!this.props.specs) {
      return(null);
    }
    const cookies = new Cookies();
    var auth_header = 'Bearer ' + cookies.get('lynx_token');
    const request = axios({
      method: 'GET',
      url: `${this.props.specs.cdriveApiUrl}list/?path=users/${this.props.specs.username}/apps/lynx`,
      headers: {'Authorization': auth_header}
    });
    request.then(response => {
      if (response.data.driveObjects.filter(dobj => dobj.name === "optional_parameters.json").length > 0) {
        this.setState({paramsPath: `users/${this.props.specs.username}/apps/lynx/optional_parameters.json`});
      }
    }, err => {
    });
  }
  fetchParameters() {
    if(this.state.paramsPath !== "") {
      const cookies = new Cookies();
      const request = axios({
        method: "GET",
        url: `${this.props.specs.cdriveApiUrl}download?path=${this.state.paramsPath}`,
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
              this.setState({parameters: res.data, step: 2});
            },
          );
        },
      );
    } else {
      this.setState({step:2});
    }
  }
  updateParameter(i, j, value) {
    console.log(this.state.parameters);
    var params = this.state.parameters;
    params[i]["parameters"][j]["value"] = value;
    this.setState({parameters: params});
  }
  executeJob() {
    const cookies = new Cookies();
    const request = axios({
      method: 'POST',
      url: `${this.props.specs.appUrl}api/execute-workflow/`,
      data: {
        ...this.props.config,
        inputPath: this.state.inputPath,
        outputPath: this.state.outputPath,
        parameters: this.state.parameters
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
      let stepContent;
      if (this.state.step === 1) {
        stepContent = (
          <div className="app-content">
            <div className="app-message">
              {`Customized for ${this.props.config.taskType} using config file ${this.props.configName}.`}
            </div>
            <div className="app-message">
              {`Enter CDrive paths to input folder, output folder and optionally a parameters file and click next.`}
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
                  <input type="text" className="cdrive-path-input my-3 px-3" placeholder="Optional parameters file" value={this.state.paramsPath} onChange={e => this.setState({paramsPath: e.target.value})} />
                  <button className="browse-button my-3" onClick={() => this.setState({paramsPathSelector: true})}>
                    {"Browse"}
                  </button>
                </td>
              </tr>
              <tr>
                <td>
                  <div className="w-100 my-4 text-center">
                    <button className="btn btn-primary btn-lg" style={{width: 200}} onClick={this.fetchParameters}>
                      {"Next"}
                    </button>
                  </div>
                </td>
              </tr>
            </table>
            <CDrivePathSelector show={this.state.inputPathSelector} toggle={() => this.setState({inputPathSelector : false})}
              action={path => this.setState({inputPath: path})} title="Select Input Folder"  actionName="Select this folder"
              driveObjects={this.state.driveObjects} type="folder" />
            <CDrivePathSelector show={this.state.outputPathSelector} toggle={() => this.setState({outputPathSelector : false})}
              action={path => this.setState({outputPath: path})} title="Select Output Folder"  actionName="Select this folder"
              driveObjects={this.state.driveObjects} type="folder" />
            <CDrivePathSelector show={this.state.paramsPathSelector} toggle={() => this.setState({paramsPathSelector : false})}
              action={path => this.setState({paramsPath: path})} title="Select Optional Parameters File"  actionName="Select"
              driveObjects={this.state.driveObjects} type="file" />
          </div>
        );
      } else {
        let paramRows;
        paramRows = [];
        if (this.state.parameters.length === 0) {
          paramRows.push(
            <tr>
              <td>
                <span className="mx-3">No optional parameters found</span>
              </td>
            </tr>
          )
        } else {
          this.state.parameters.forEach((stage, i) => {
            paramRows.push(
              <tr key={stage.stage}>
                <td>
                  <span className="mx-3">{stage.stage}:</span>
                </td>
              </tr>
            );
            stage.parameters.forEach((param, j) => {
              paramRows.push(
                <tr key={stage.stage + "-" + param.name}>
                  <td/>
                  <td>
                    <span className="mx-3">{param.name}:</span>
                  </td>
                  <td>
                    <input type="text" placeholder="Value" value={param.value} className="p-2 mx-3 my-2"
                    onChange={e => this.updateParameter(i, j, e.target.value)} />
                  </td>
                </tr>
              );
            });
          });
        }
        stepContent = (
          <div className="app-content">
            <div className="app-message">
              {`Customized for ${this.props.config.taskType} using config file ${this.props.configName}.`}
            </div>
            <div className="app-message">
              {`Verify optional parameters and click start`}
            </div>
            <table className="mx-auto">
              {paramRows}
              <tr>
                <td colSpan={3}>
                  <div className="w-100 my-4 text-center">
                    <button className="btn btn-primary btn-lg mx-3" style={{width: 200}} onClick={this.executeJob}>
                      {"Start"}
                    </button>
                    <button className="btn btn-secondary btn-lg mx-3" style={{width: 200}} onClick={() => this.setState({step: 1})}>
                      {"Back"}
                    </button>
                  </div>
                </td>
              </tr>
            </table>
          </div>
        );
      }
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
            {stepContent}
          </div>
        </div>
      );
    }
  }
}

export default CreateJob;
