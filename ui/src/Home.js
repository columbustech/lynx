import React from 'react';
import CreateJob from './CreateJob';
import EditConfig from './EditConfig';
import './Lynx.css';

class Home extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      component: null,
      pageReady: false,
      config: {}
    };
  }
  componentDidMount() {
    if (Object.keys(this.props.config).length === 0) {
      this.setState({
        pageReady: true,
        component: (
          <EditConfig 
            specs={this.props.specs} 
            config={this.props.config} 
            updateConfig={config => this.setState({
              config: config, component: <CreateJob specs={this.props.specs} config={config} />
            })} 
            cancelUpdate={() => this.setState({
              component: <CreateJob specs={this.props.specs} config={this.state.config} />
            })} 
          />
        ),
        config: this.props.config
      });
    } else {
      this.setState({
        pageReady: true,
        component: <CreateJob specs={this.props.specs} config={this.props.config} />,
        config: this.props.config
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
