/*
Copyright 2015 Gravitational, Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
var reactor = require('app/reactor');
var session = require('app/services/session');
var api = require('app/services/api');
var cfg = require('app/config');
var getters = require('./getters');
var sessionModule = require('./../sessions');

const logger = require('app/common/logger').create('Current Session');
const { TLPT_CURRENT_SESSION_OPEN, TLPT_CURRENT_SESSION_CLOSE } = require('./actionTypes');

const actions = {

  close(){
    let {isNewSession} = reactor.evaluate(getters.currentSession);

    reactor.dispatch(TLPT_CURRENT_SESSION_CLOSE);

    if(isNewSession){
      session.getHistory().push(cfg.routes.nodes);
    }else{
      session.getHistory().push(cfg.routes.sessions);
    }
  },

  resize(w, h){
    // some min values
    w = w < 5 ? 5 : w;
    h = h < 5 ? 5 : h;

    let reqData = { terminal_params: { w, h } };
    let {sid} = reactor.evaluate(getters.currentSession);

    logger.info('resize', `w:${w} and h:${h}`);
    api.put(cfg.api.getTerminalSessionUrl(sid), reqData)
      .done(()=> logger.info('resized'))
      .fail((err)=> logger.error('failed to resize', err));
  },

  openSession(sid){
    logger.info('attempt to open session', {sid});
    sessionModule.actions.fetchSession(sid)
      .done(()=>{
        let sView = reactor.evaluate(sessionModule.getters.sessionViewById(sid));
        let { serverId, login } = sView;
        logger.info('open session', 'OK');
        reactor.dispatch(TLPT_CURRENT_SESSION_OPEN, {
            serverId,
            login,
            sid,
            isNewSession: false
          });
      })
      .fail((err)=>{
        logger.error('open session', err);
        session.getHistory().push(cfg.routes.pageNotFound);
      })
  },

  createNewSession(serverId, login){
    let data = { 'session': {'terminal_params': {'w': 5, 'h': 5}, login}}
    api.post(cfg.api.siteSessionPath, data).then(json=>{
      let sid = json.session.id;
      let routeUrl = cfg.getActiveSessionRouteUrl(sid);
      let history = session.getHistory();

      reactor.dispatch(TLPT_CURRENT_SESSION_OPEN, {
       serverId,
       login,
       sid,
       isNewSession: true
      });

      history.push(routeUrl);
   });

  }
}

export default actions;