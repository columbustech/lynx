import React from 'react';
import './Lynx.css'; 

class ErrorPage extends React.Component{
  render() {
    return(
      <div className="app-page">
        <div className="app-header">
          <div className="app-header-title">
            {"Lynx 1.0: End-to-End Semantic Matching"}
          </div>
        </div>
        <div className="app-body">
          <div className="app-content">
            <div className="app-message">
              {`Lynx needs to have edit permission on users/${this.props.specs.username}/apps/lynx folder.`}
              <br/>
              {`Restart Lynx app after creating this folder in CDrive (if it does not exist)`}
              <br/>
              {`and providing edit permission on it.`}
            </div>
            <div className="text-center">
              <a href={this.props.specs.cdriveUrl} className="btn btn-primary btn-lg">Go back to CDrive</a>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorPage;
