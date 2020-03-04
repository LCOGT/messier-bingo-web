/* globals $ rivetsBindings rivets apiRoot refreshTable */
'use strict';

var apiRoot = 'https://observe.lco.global/api/';

// rivets.bind($('#profile'), profile);

$.ajaxPrefilter(function(options, originalOptions, jqXHR){
  if(options.url.indexOf('lco.global/') >= 0 && localStorage.getItem('token')){
    jqXHR.setRequestHeader('Authorization', 'Token ' + localStorage.getItem('token'));
  }
});

async function matchProposals(){
  var match=false;
  var proposal;
  const proposals = await getProposals();
  for (i=0;i<proposals.length;i++){
    proposal = proposals[i].id
    const result = await suitabilityCheck(proposal);
    if (result == true){
        match = true;
    }
    if (match){
      return proposal
    }
  }
  if (proposal == undefined){
    return false
  }
}

function getProposals(){
  var proposals = Array()
  return $.getJSON(apiRoot + 'profile/').then(function(data){
    for (i=0;i<data.proposals.length;i++){
      if (data.proposals[i]['current']) {
        proposals.push(data.proposals[i]);
      }
    }
    return proposals;
  });
}

function suitabilityCheck(proposal_code){
    return $.getJSON(apiRoot + 'proposals/'+proposal_code+'/').then(function(data){
      for (i=0;i<data.timeallocation_set.length;i++){
        if (data.timeallocation_set[i].instrument_type == '0M4-SCICAM-SBIG'){
          if (data.timeallocation_set[i].std_allocation >  data.timeallocation_set[i].std_time_used){
            return true
          }
        }
      }
      return false
    });
}

function login(username, password, callback){
  $.post(
    apiRoot + 'api-token-auth/',
    {
      'username': username,
      'password': password
    }
  ).done(function(data){
    localStorage.setItem('token', data.token);
    matchProposals().then(function(proposal){
      if (proposal){
        localStorage.setItem('proposal_code',proposal)
        callback({success:true});
        $('.loggedin').show();
        $('.not_loggedin').hide();
      }else{
        callback({success:false, msg:"You do not have 0.4m credit available"});
        localStorage.removeItem('token');
      }
    });

  }).fail(function(){
    console.error("Login Failed!")
    callback({success:false, msg:"Login Failed"});
  });
}

function logout(){
  localStorage.removeItem('token');
  localStorage.removeItem('proposal_code');
  window.location.replace("/");
}

function submit_to_serol(object, start, end){
  var target = {
    "type": "ICRS",
    "name": object['m'],
    "ra": object['ra'],
    "dec": object['dec'],
    'epoch': 2000
  }
  var constraints = constraints = {
    'max_airmass': 1.6,
    'min_lunar_distance': 30
  }
  var inst_configs = Array();
  for (i=0;i<object['filters'].length;i++){
      var mol = {
                'exposure_time': object['filters'][i]['exposure'],
                'exposure_count': 1,
                'optical_elements': {
                    'filter': object['filters'][i]['name']
                }
            }
      inst_configs.push(mol)
  }
  var config  = [{
        'type': 'EXPOSE',
        'instrument_type': '0M4-SCICAM-SBIG',
        'target': target,
        'constraints': constraints,
        'acquisition_config': {},
        'guiding_config': {},
        'instrument_configs': inst_configs
    }]
  var timewindow = {
    "start": start,
    "end": end
    }
  var request = {
    "location":{"telescope_class":"0m4"},
    "constraints":{"max_airmass":2.0},
    "target": target,
    "configurations": config,
    "windows": [timewindow],
    "observation_note" : "Serol",
    "type":"request"
  }
  var data = {
      "name": "mb_"+start.substr(0,10)+"_"+object['m'],
      "proposal": localStorage.getItem("proposal_code"),
      "ipp_value": 1.05,
      "operator": "SINGLE",
      "observation_type": "NORMAL",
      "requests": [request],
  }
  $.ajax({
    url: 'https://observe.lco.global/api/requestgroups/',
    type: 'post',
    data: JSON.stringify(data),
    headers: {'Authorization': 'Token '+localStorage.getItem("token")},
    dataType: 'json',
    contentType: 'application/json'})
    .done(function(resp){
      var content = "<h3>Success!</h3><p>Your image will be ready in the next week.</p>"
      $('#message-content').html(content);
      $('#observe_button').hide();
      closePopup('2000');
      // Stop them from accidentally submitting a second time
    })
    .fail(function(resp){
      var msg;
      if (resp.responseJSON['requests'][0]['non_field_errors'] != undefined){
        msg = resp.responseJSON['requests'][0]['non_field_errors'][0];
      } else if (resp.responseJSON['requests'][0]['windows'][0]['non_field_errors'] != undefined){
        msg = resp.responseJSON['requests'][0]['windows'][0]['non_field_errors'][0];
      } else {
        msg = "An error occured.";
      }

      var content = "<h3>Error!</h3><p>Sorry, there was a problem submitting your request.</p><p>"+msg+"</p>";
			$('#message-content').html(content);
			closePopup('4000');

    });
}
