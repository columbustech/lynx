import React from 'react';
import Cookies from 'universal-cookie';
import axios from 'axios';
import Table from 'react-bootstrap/Table';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import './Lynx.css';

class Home extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      jobList: [],
    };
    this.listJobs = this.listJobs.bind(this);
    this.selectJob = this.selectJob.bind(this);
    this.deleteJob = this.deleteJob.bind(this);
  }
  componentDidMount() {
    this.listJobs();
  }
  listJobs() {
    const cookies = new Cookies();
    const request = axios({
      method: 'GET',
      url: `${this.props.specs.cdriveUrl}app/${this.props.specs.username}/lynx/api/list-jobs/`,
      headers: {'Authorization': `Bearer ${cookies.get('lynx_token')}`}
    });
    request.then(response => {
      this.setState({
        jobList: response.data
      });
    },err => {
    });
  }
  selectJob(e, uid) {
    if (!e.target.classList.contains("dropdown-item") && !e.target.classList.contains("btn")) {
      window.location.href = `${this.props.specs.cdriveUrl}app/${this.props.specs.username}/lynx/job/${uid}`;
    }
  }
  deleteJob(e, uid) {
    const cookies = new Cookies();
    const request = axios({
      method: 'POST',
      url: `${this.props.specs.cdriveUrl}app/${this.props.specs.username}/lynx/api/delete-job/`,
      data: {
        uid: uid
      },
      headers: {'Authorization': `Bearer ${cookies.get('lynx_token')}`}
    });
    request.then(response => {
      this.listJobs();
    },);
  }
  render() {
    let table;
    if (this.state.jobList.length !== 0) {
      let rows;
      rows = this.state.jobList.map((job, i) => {
        return (
          <tr key={i} className="app-row" onClick={e => this.selectJob(e, job.uid)}>
            <td>
              {job.job_name}
            </td>
            <td>
              {job.stage}
            </td>
            <td>
              <DropdownButton variant="transparent" title="" alignRight >
                <Dropdown.Item onClick={e => this.deleteJob(e, job.uid)}>
                  Delete
                </Dropdown.Item>
              </DropdownButton>
            </td>
          </tr>
        );
      });
      table = (
        <Table>
          <thead>
            <tr>
              <td style={{minWidth: 200}}>Job Name</td>
              <td style={{minWidth: 200}}>Stage</td>
              <td>Actions</td>
            </tr>
          </thead>
          <tbody>
            {rows}
          </tbody>
        </Table>
      );
    } else {
      table = (
        <div>No Existing Schema Matching Jobs on Lynx</div>
      );
    }
    return (
      <div className="app-container">
        <div className="app-header">
          Lynx: An End to End Schema Matching Solution
        </div>
        <div className="app-table mt-5">
          {table}
        </div>
        <div className="app-menu mt-5">
          <a className="btn btn-primary" href={`${this.props.specs.cdriveUrl}app/${this.props.specs.username}/lynx/create`} style={{marginLeft: 50, width: 150}}>
            New Job
          </a>
        </div>
      </div>
    );
  }
}

export default Home;
