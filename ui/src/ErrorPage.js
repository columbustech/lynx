import React from 'react';

class ErrorPage extends React.Component{
  render() {
    return(
      <div className="app-container">
        <div className="app-header">An Error occured</div>
        <div className="error-container">
          <div className="app-message">
            {`Lynx needs to have edit permission on users/${this.props.specs.username}/apps/lynx folder. Restart Lynx app after creating the lynx folder in CDrive and providing edit permission on it.`}
          </div>
          <div className="text-center">
            <a href={this.props.specs.cdriveUrl} className="btn btn-primary btn-lg">Go back to CDrive</a>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorPage;
