import React from 'react';
import Cookies from 'universal-cookie';
import axios from 'axios';
import JobStatus from './JobStatus';
import ErrorPage from './ErrorPage';
import Home from './Home';
import { BrowserRouter as Router, Route, Switch, Redirect} from 'react-router-dom';

class App extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      uid: "",
      specs: {},
      config: {},
      isLoggedIn: false,
      canAccessAppData: false
    };
    this.initPage = this.initPage.bind(this);
    this.authenticateUser = this.authenticateUser.bind(this);
    this.getConfig = this.getConfig.bind(this);
  }
  authenticateUser() {
    const cookies = new Cookies();
    var accessToken = cookies.get('lynx_token');
    if (accessToken !== undefined) {
      //this.setState({isLoggedIn: true});
      this.getConfig();
      return;
    }
    var url = new URL(window.location.href);
    var code = url.searchParams.get("code");
    if (code == null) {
      window.location.href = `${this.state.specs.authUrl}o/authorize/?response_type=code&client_id=${this.state.specs.clientId}&redirect_uri=${this.state.specs.appUrl}&state=1234xyz`;
    } else {
      const request = axios({
        method: 'POST',
        url: `${this.state.specs.appUrl}api/access-token/`,
        data: {
          code: code,
          redirect_uri: this.state.specs.appUrl
        }
      });
      request.then(
        response => {
          cookies.set('lynx_token', response.data.access_token);
          window.location.href = this.state.specs.appUrl;
        }, err => {
        }
      );
    }
  }
  initPage() {
    const request = axios({
      method: 'GET',
      url: `${process.env.PUBLIC_URL}/api/specs/`
    });
    request.then(
      response => {
        this.setState({"specs": response.data});
      },
    );
  }
  getConfig() {
    const cookies = new Cookies();
    const request = axios({
      method: 'GET',
      url: `${this.state.specs.appUrl}api/config/`,
      headers: {
        'Authorization': `Bearer ${cookies.get('lynx_token')}`,
      }
    });
    request.then(
      response => {
        this.setState({
          config: response.data,
          canAccessAppData: true,
          isLoggedIn: true
        });
      }, err => {
        if (err.response.status === 401) {
          window.location.reload(false);
        } else if(err.response.status === 403) {
          this.setState({
            canAccessAppData: false,
            isLoggedIn: true
          });
        }
      }
    );
  }
  render() {
    if (Object.keys(this.state.specs).length === 0) {
      this.initPage();
      return (null);
    } else if (!this.state.isLoggedIn) {
      this.authenticateUser();
      return (null);
    } else {
      var url = new URL(process.env.PUBLIC_URL);
      let router;
      if (this.state.canAccessAppData) {
        router = (
          <Router basename={url.pathname} >
            <Switch>
              <Route 
                path="/job/:uid"
                render={(props) => <JobStatus {...props} specs={this.state.specs} />}
              />
              <Route
                path="/error/"
                render={(props) => <ErrorPage {...props} specs={this.state.specs} />}
              />
              <Route 
                path="/" 
                render={(props) => <Home {...props} specs={this.state.specs} config={this.state.config} />} 
              />
            </Switch>
          </Router>
        );
      } else {
          router = (
            <Router basename={url.pathname} >
              <Switch>
                <Route
                  path="/error/"
                  render={(props) => <ErrorPage {...props} specs={this.state.specs} />}
                />
                <Redirect from='*' to='/error/' />
              </Switch>
            </Router>
          );
      }
      return router;
    }
  }
}

export default App;
