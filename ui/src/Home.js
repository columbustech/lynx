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
        component: EditConfig,
        config: this.props.config
      });
    } else {
      this.setState({
        pageReady: true,
        component: CreateJob, 
        config: this.props.config
      });
    }
  }
  render() {
    if (this.state.pageReady) {
      return (
        <this.state.component 
          specs={this.props.specs} 
          config={this.state.config} 
          updateConfig={config => this.setState({
            config: config, component: CreateJob
          })} 
          cancelUpdate={() => this.setState({
            component: CreateJob
          })}
          editConfig={() => this.setState({
            component: EditConfig
          })}
        />
      );
    } else {
      return (null);
    }
  }
}

export default Home;
