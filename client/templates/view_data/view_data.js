/*
* JS file for view_data.js
*/
var d3 = require('d3');
//Generate classroom buttons immediately
Template.viewData.rendered = function() {
  var envs = Environments.find({}).fetch();
  if ($.isEmptyObject(envs)) {
    $('.env-selection').append('<h2 class="subtitle is-2" style="color: red;">You must create classroom data before doing an analysis is possible.</h2>')
  } else {

    var classButtons = $('.env-selection');
    for (env in envs) {
      name = envs[env]['envName'];
      id = envs[env]['_id'];

      var button = $('<div>', {
        class: "o--box-container o--box classroom-selection",
        text: name,
        data_id: id
      }).appendTo(classButtons);

      button.click(function (e) {
          e.preventDefault();

          $(this).siblings().removeClass('chosen');
          if ( $(this).hasClass('chosen') ){
            $(this).removeClass('chosen');
          } else {
            $(this).addClass('chosen');
          }
        });
    }
  }
}

Template.viewData.helpers({
   environment: function() {
      return Environments.find({}, {sort: {submitted: -1}});
   },
});

Template.viewData.helpers({
   sequences: function() {
      return Sequences.find();
   },
});

Template.viewData.helpers({
   subjects: function() {
      return Subjects.find();
   },
});



Template.viewData.events({

  'click .reset-button': function (e) {
    location.reload()
  },

  'click .help-button': function (e) {
    $('#help-env-modal').addClass("is-active");
  },
  'click #help-close-modal': function(e) {
    $('#help-env-modal').removeClass("is-active");
  },
  'click .modal-card-foot .button': function(e) {
    $('#help-env-modal').removeClass("is-active");
  },

  'click .generate-button': function (e) {
    // Get classroom, obs, and all params.
    obsIds = [];
    dParams = [];
    sParams = [];

    envId = $('.env-selection .chosen').attr('data_id');
    $('.obs-selection .chosen').each(function () { obsIds.push($(this).attr('data_id')) });
    $('.dparam-selection .chosen').each(function () { dParams.push($(this).attr('data_id')) });
    $('.sparam-selection .chosen').each(function () { sParams.push($(this).attr('data_id')) });
    let contributions = Sequences.find({'envId': envId}).fetch();
    let totalCont = contributions.filter(function(contribution) {
       return obsIds.includes(contribution.obsId);
   }).length;

    if (obsIds.length === 0 || contributions.length === 0 || totalCont === 0) {
        alert("At least one observation or contribution is required prior to generating a report.");
        return;
    }
    // Start generating graphs
    demData = makeDemGraphs(envId, dParams);
    groupCData = makeContributionGraphs(obsIds, dParams, sParams);

    classStats(envId, sParams, obsIds);
    makeRatioGraphs(envId, groupCData, demData);
    makeIndividualGraphs(obsIds);

    $('.option-select').css('display', 'none');
    $('.report-body').css('visibility', 'visible');
  },

  'click .classroom-selection': function(e) {
    envId = $(e.target).attr('data_id');
    obs = Observations.find({"envId": envId}).fetch();
    dparams = SubjectParameters.findOne({'children.envId': envId});
    sparams = SequenceParameters.findOne({'children.envId': envId});

    $(".obs-selection").empty();
    $(".dparam-selection").empty();
    $(".sparam-selection").empty();

    var obsButtons = $('.obs-selection');
    for (ob in obs) {
      name = obs[ob]['name'];
      id = obs[ob]['_id'];

      var button = $('<div>', {
        class: "o--box-container o--box option-selectors",
        text: name,
        data_id: id
      }).appendTo(obsButtons);

      button.click(function (e) {
          e.preventDefault();

          if ( $(this).hasClass('chosen') ){
            $(this).removeClass('chosen');
          } else {
            $(this).addClass('chosen');
          }
        });
    }

    var SA = $('<div>', {
        class: "o--box-container o--box option-selectors",
        text: "Select All",
        data_id: 999
      }).appendTo(obsButtons);

    SA.click(function (e) {
      e.preventDefault();
      $(this).siblings().addClass('chosen');
    });

    var demButtons = $('.dparam-selection');
    dpairs = dparams['children']['parameterPairs'];
    for (var d = 0; d < dpairs; d++) {
      name = dparams['children']['label'+d];
      id = dparams['children']['label'+d];

      var button = $('<div>', {
        class: "o--box-container o--box option-selectors",
        text: name,
        data_id: id
      }).appendTo(demButtons);

      button.click(function (e) {
          e.preventDefault();

          if ( $(this).hasClass('chosen') ){
            $(this).removeClass('chosen');
          } else {
            $(this).addClass('chosen');
          }
        });
    }

    var DSA = $('<div>', {
        class: "o--box-container o--box option-selectors",
        text: "Select All",
        data_id: 999
      }).appendTo(demButtons);

    DSA.click(function (e) {
      e.preventDefault();
      $(this).siblings().addClass('chosen');
    });

    var seqButtons = $('.sparam-selection');
    spairs = sparams['children']['parameterPairs'];
    for (var s = 0; s < spairs; s++) {
      name = sparams['children']['label'+s];
      id = sparams['children']['label'+s];

      var button = $('<div>', {
        class: "o--box-container o--box option-selectors",
        text: name,
        data_id: id
      }).appendTo(seqButtons);

      button.click(function (e) {
          e.preventDefault();

          if ( $(this).hasClass('chosen') ){
            $(this).removeClass('chosen');
          } else {
            $(this).addClass('chosen');
          }
        });
    }
    var SSA = $('<div>', {
        class: "o--box-container o--box option-selectors",
        text: "Select All",
        data_id: 999
      }).appendTo(seqButtons);

    SSA.click(function (e) {
      e.preventDefault();
      $(this).siblings().addClass('chosen');
    });

   },
   //This should probably be a modal??
  'click .export-class-button': function(e){

    var envId = $('.env-selection .chosen').attr('data_id');
    if(envId)
     {
        var environment = Environments.findOne({"_id":envId});
        var envName = environment['envName'];
        var subjects=Subjects.find({"envId":envId}).fetch();
        var literalArray = []
        for (i=0;i<subjects.length;i++) {
          new_sub = subjects[i]['info'];
          new_sub['envName'] = envName;
          literalArray.push(new_sub);
        }
        var csv = Papa.unparse({
          data: literalArray,
        });
        var csvData = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
        var csvURL =  null;
        //IE download API for saving files client side
        if (navigator.msSaveBlob) {
            csvURL = navigator.msSaveBlob(csvData, 'download.csv');
        } else {
        //Everything else
            csvURL = window.URL.createObjectURL(csvData);
        }
        var tempLink = document.createElement('a');
        tempLink.href = csvURL;
        tempLink.setAttribute('download', envName+'_classroom_export.csv');
        tempLink.click();
      } else {
        alert("Please select a classroom to export!")
      }
  },
  'click .export-data-button': function(e) {

     var envId = $('.env-selection .chosen').attr('data_id');

     if(envId)
     {
        var environment = Environments.findOne({"_id":envId});
        var envName = environment['envName'];
        var sequences=Sequences.find({"envId":envId}).fetch();
        var literalArray = []
        for (i=0;i<sequences.length;i++) {
          new_seq = sequences[i]['info'];
          new_seq['time'] = sequences[i]['time'];
          new_seq['obsName'] = sequences[i]['obsName'];
          new_seq['envName'] = envName;
          literalArray.push(new_seq);
        }
        var csv = Papa.unparse({
          data: literalArray,
        });
        var csvData = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
        var csvURL =  null;
        //IE download API for saving files client side
        if (navigator.msSaveBlob) {
            csvURL = navigator.msSaveBlob(csvData, 'download.csv');
        } else {
        //Everything else
            csvURL = window.URL.createObjectURL(csvData);
        }
        var tempLink = document.createElement('a');
        tempLink.href = csvURL;
        tempLink.setAttribute('download', envName+'_sequence_export.csv');
        tempLink.click();
      } else {
        alert("Please select a classroom to export!")
      }

    }
});

function renderStats(stats, data, name, total) {
  if (!data) {
    return;
  }

  var sumValues = obj => Object.values(obj).reduce((a, b) => a + b);
  var totalValue = sumValues(data);

  var rowTwo = $('<div/>', {
    class: "category-list",
  }).appendTo(stats);

  var sh = $('<h3/>', {
    class: "stat-head title is-5",
    text: name
  }).appendTo(rowTwo);
  var bullets4 = $('<ul/>', {
    class: "stat-list"
  }).appendTo(rowTwo);
  for (key in data) {
    if (data.hasOwnProperty(key)) {
        var pct = (data[key] / totalValue) * 100;
        var ac = $('<li/>', {
          text: ""+key+": " + data[key] + " / "+ parseFloat(pct.toFixed(2)) + "%",
          class: "single-stat"
        }).appendTo(bullets4)
    }
  }
}

function classStats(envId, sParams, obsId) {
  var studs = Subjects.find({"envId": envId}).fetch();
  var conts = Sequences.find({'envId': envId}).fetch();
  var totalStuds = studs.length;
  var studTrack = new Set();
  var totalCont = conts.filter(function(contribution) {
     return obsIds.includes(contribution.obsId);
 }).length;
  var stats = $('.class-stats');

  var filteredResults = conts.filter(function(result) {
      return obsId.includes(result.obsId);
  });

  var classRoomSummary = $('<div/>', {
      class: "category-summary",
  }).appendTo(stats);
  var fh = $('<h3/>', {
    class: "stat-head title is-5",
    text: "Classroom Summary"
  }).appendTo(classRoomSummary);


  sParams.forEach(function(param, idx) {
    var newObject = {};
    var paramWithData = [];
    for (con in filteredResults) {
      var next = filteredResults[con]['info'];
      studTrack.add(next['studentId']);
      if (next[param]) {
        if (next[param] in newObject) {
          newObject[next[param]] += 1;
        } else {
          paramWithData.push(next[param]);
          newObject[next[param]] = 1;
        }
      }
    }

    function getKeyByValue(object, value) {
        return Object.keys(object).find(key => object[key] === value);
    }

    var sequenceParameters = SequenceParameters.find({'children.envId':envId}).fetch()[0];
    var paramkey = getKeyByValue(sequenceParameters.children, param);
    var position = paramkey.split("").pop();
    var paramPosition = `parameter${position}`;
    var parameters = sequenceParameters.children[paramPosition].split(",").map((str)=> { return str.trim()})
    parameters.filter((obj) => { return paramWithData.indexOf(obj) == -1;}).forEach((item) => { newObject[item] = 0; })

    var total = studTrack.size;

    renderStats(stats, newObject, param, total);
  });

  var bullets = $('<ul/>', {
    class: "stat-list"
  }).appendTo(classRoomSummary);
  var tc = $('<li/>', {
    text: "Students who Contributed: "+studTrack.size,
    class: "single-stat"
  }).appendTo(bullets)
  var ts = $('<li/>', {
    text: "Total Students: "+totalStuds,
    class: "single-stat"
  }).appendTo(bullets)
  var perc = parseFloat(studTrack.size/totalStuds).toFixed(2);
  var pp = $('<li/>', {
    text: "Percent Contributing: "+parseFloat(perc*100).toFixed(2)+" %",
    class: "single-stat"
  }).appendTo(bullets)
  var ac = $('<li/>', {
    text: "Total Contributions: "+totalCont,
    class: "single-stat"
  }).appendTo(bullets)
  var ps = $('<li/>', {
    text: "Contributions per student: "+parseFloat(totalCont/studTrack.size).toFixed(2),
    class: "single-stat"
  }).appendTo(bullets)
}

function makeDemGraphs(env, dparams) {
  var subs = Subjects.find({"envId": env}).fetch();
  var data = {}
  for (p in dparams) {
    data[dparams[p]] = {}
    for (s in subs) {
      var val = subs[s]['info'][dparams[p]]
      if (val && val in data[dparams[p]]) {
        data[dparams[p]][val] += 1;
      } else if (val) {
        data[dparams[p]][val] = 1;
      }
    }
  }

  for (key in data){
    makePieChart(d3.entries(data[key]), key);
  }


  return data;

}

function makeContributionGraphs(obsIds, dp, sp) {
  data = {};
  for (d in dp) {
    data[dp[d]] = {};
  }

  for (id in obsIds) {
    var seqs = Sequences.find({"obsId" : obsIds[id]}).fetch();
    for (seq in seqs) {
      var studId = seqs[seq]['info']['studentId'];
      var student = Subjects.findOne({"_id": studId});
      for (s in sp) {
        var param = sp[s];
        var value = seqs[seq]['info'][param];
        if (!value) {continue; }
        for (d in dp) {
          var dem = dp[d];
          var demVal = student['info'][dem]
          if (!demVal) {continue; }
          if (!(param in data[dp[d]])) { data[dem][param] = {}; }
          if (!(value in data[dem][param])) { data[dem][param][value] = {}; }
          if (demVal in data[dem][param][value]) {
            data[dem][param][value][demVal] += 1;
          } else {
            data[dem][param][value][demVal] = 1;
          }
        }

      }
    }
  }

  for (demp in data) {
    for (param in data[demp]) {
      var label = ""+param+" by "+demp;
      var dataSlice = d3.entries(data[demp][param]);
        //Commenting out until final decision
        //No need for now!!
        //makeStackedBar(dataSlice, label, ".contribution-plots", "# of Contributions");
    }
  }
  return data;

}

function makeRatioGraphs(envId, cData, dData) {
  var statData = {};
  var total = d3.sum(d3.values(dData[d3.keys(dData)[0]]))
  var allParams = SubjectParameters.findOne({"children.envId": envId});

  for (key in dData) {
    statData[key] = dData[key];
    d3.keys(statData[key]).map(function (k, i) { statData[key][k] /= total });
  }

  var ratioData = {}

  for (demo in cData) {
    ratioData[demo] = cData[demo];
    for (param in cData[demo]) {
      for (c in cData[demo][param]) {
        var totalCat = d3.sum(d3.values(cData[demo][param][c]));
        d3.keys(ratioData[demo][param][c]).map(function (k, i) { ratioData[demo][param][c][k] /= totalCat });
        d3.keys(ratioData[demo][param][c]).map(function (k, i) { ratioData[demo][param][c][k] /= (statData[demo][k]) });
      }
    }
  }

  for (demp in ratioData) {
    for (param in ratioData[demp]) {
      var label = param + " by " + demp;
      var dataSlice = d3.entries(data[demp][param]);
      //new
        for (obj in dataSlice) {
          for (var x=0; x < allParams['children']['parameterPairs']; x++) {
            if (allParams['children']['label'+x] == demp) {
              selection = allParams['children']['parameter'+x];
              listedParams = selection.split(',').map((str) => { return str.trim() });
              for (p in listedParams) {
                if (listedParams[p] in dataSlice[obj].value) {
                  continue;
                } else {
                  dataSlice[obj]['value'][listedParams[p]] = 0.0;
                }
              }
            }
          }
        }

        var sortedData = [];

        function getKeyByValue(object, value) {
            return Object.keys(object).find(key => object[key] === value);
        }
        var sequenceParameters = SequenceParameters.find({'children.envId':envId}).fetch()[0];
        var paramkey = getKeyByValue(sequenceParameters.children, param);
        var position = paramkey.split("").pop();
        var paramPosition = `parameter${position}`;
        var barParams = sequenceParameters.children[paramPosition].split(",").map((str) => { return str.trim() });
        for (var i = 0; i < barParams.length; i++) {
            for (var j = 0; j < dataSlice.length; j++) {
                if (barParams[i] === dataSlice[j].key) {
                    sortedData.push(dataSlice[j]);
                }
            }
        }
        makeStackedBar(sortedData, label, ".ratio-plots", "Equity Ratio");
    }
  }
}

function makeIndividualGraphs(oIds) {
  var subjects = Subjects.find({"envId":envId}).fetch();
  var contribs = {};
  var filteredNamesObj = {};
  var names = [];

  for (id in oIds) {
    var nc = Sequences.find({"obsId": oIds[id]}).fetch();
    for (c in nc) {
      if (contribs[nc[c]['info']["Name"]]) {
        contribs[nc[c]['info']["Name"]] += 1;

      } else {
        contribs[nc[c]['info']["Name"]] = 1;
        names.push(nc[c]['info']["Name"]);
      }
    }
  }

  var filteredNames = subjects.filter(function(e) {
      return names.indexOf(e.info.name) === -1;
  });

  filteredNames.forEach(function(name){
      var newName = name.info.name;
      filteredNamesObj[newName] = 0.1;
  })

  var completeContrib = Object.assign({}, contribs, filteredNamesObj);

  data = d3.entries(completeContrib);
  data = _(data).sortBy('value')
  var newWidth = data.length * 80;
  var containerWidth = newWidth * 1.05;
  var x1 = d3.scaleBand().padding(0.5);
  var margin = {top: 50, right: 20, bottom: 30, left: 40},
      width = newWidth - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom,
      fullW = newWidth,
      fullH = 500;
  if (containerWidth < 960 ) {
      containerWidth = 960;
  }

  var svg = d3.select(".individual-plots")
            .append("svg")
            .attr('width', containerWidth.toString())
            .attr('height', fullH);

  var svgY = d3.select('.vert-ind')
    .append('svg')
    .attr('height', fullH)
    .attr("width", 50);

  var g = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var x = d3.scaleBand().rangeRound([0, fullW]).padding(0.5),
      y = d3.scaleLinear().rangeRound([height, 0]);

  x.domain(data.map(function(d) { return d.key.slice(0,10); }));
  y.domain([0, d3.max(data, function(d) { return d.value; })]);

  g.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x))

  svgY.append("g")
      .attr("class", "axis axis--y")
      .attr("transform", "translate(50," + 63 + ")")
      .call(d3.axisLeft(y).ticks())

    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", "0.71em")
      .attr("text-anchor", "end")
      .text("Frequency");

  g.selectAll(".bar")
    .data(data)
    .enter().append("rect")
      .attr("class", "single-bar")
      .attr("x", function(d) {
        return x(d.key.slice(0,10));
      })
      .attr("y", function(d) { return y(d.value) })
      .attr("width", 70)
      .attr("height", function(d) { return height - y(d.value); })

  g.selectAll(".bar")
    .data(data)
    .enter().append("text")
    .text(function(d) { if (d.value === 0.1) return 0; })
    .attr("text-anchor", "middle")
      .attr("x", function(d) {
        return (x(d.key.slice(0,10))) + 30;
      })
     .attr("y", function(d) { return y(d.value) - 10; })
     .attr("font-family", "sans-serif")
     .attr("font-size", "15px")
     .attr("fill", "black");

  g.append("text")
      .attr("x", 100)
      .attr("y", -20)
      .attr("dy", "0.32em")
      .attr("font-weight", "bold")
      .attr("text-anchor", "middle")
      .text("Contributions over Students");
}

function makePieChart(data, label) {
  var margin = {header: 100, top: 50, right: 50, bottom: 50, left: 50},
  width = 700
  height = 700 - margin.top - margin.bottom - margin.header,
  fullW = 700,
  fullH = 700,
  radius = Math.min(width, height) / 2,
  arc = d3.arc().innerRadius(radius * .6).outerRadius(radius),
  labelr = radius + 30;

  var svg = d3.select(".demo-plots")
            .append("svg")
            .attr('width', fullW)
            .attr('height', fullH);

  g = svg.append("g").attr("transform", "translate(" + (fullW/2) + "," + (fullH/2)+ ")");

  var color = d3.scaleOrdinal()
    .range(["#F15854", "#DECF3F", "#B276B2", "#B2912F", "#F17CB0", "#60BD68", "#FAA43A"]);

  var pie = d3.pie()
    .sort(null)
    .value(function(d) { return d.value; });

  var path = d3.arc()
    .outerRadius(radius - 10)
    .innerRadius(0);

  var label = d3.arc()
    .outerRadius(radius - 40)
    .innerRadius(radius - 70);

  var arcs = g.selectAll('.arc')
      .data(pie(data))
      .enter().append("g")
      .attr('class', 'arc');

  arcs.append("path")
    .attr('d', path)
    .attr('fill', function (d) { return color(d.data.key); })
    .on('mouseover', function(d) {
    $("#toolTip")
      .html(d.data.key + ": " + d.data.value )
      .show();
    })
    .on('mousemove', function(d) {
        $("#toolTip")
          .css('left', "50%")
          .css('top', "50%")
    })
    .on('mouseout', function(d) {
        $("#toolTip").html('').hide();
    });

  var textLabels = arcs.append("text")
      .attr("transform", function(d) {
          var c = arc.centroid(d),
              x = c[0],
              y = c[1],
              // pythagorean theorem for hypotenuse
              h = Math.sqrt(x * x + y * y) - 10;
          return "translate(" + (x / h * labelr) +  ',' +
             (y / h * labelr) +  ")";
      })
      .attr("dy", "1em")
      .attr("font-size", "14px")
      .attr("text-anchor", function(d) {
          return (d.endAngle + d.startAngle) / 2 > Math.PI ? "end" : "start";
      })
      .text(function(d, i) {
          if (d.data.key.length > 15 ) {
              var slicedKey = d.data.key.slice(0,10) + "...";
              return slicedKey
          } else {
              return d.data.key;
          }
      })
      .selectAll(".arc text").call(wrap, 30);

  svg.append("text")
     .attr("transform", "translate(" + fullW / 2 + "," + 20 +")")
     .attr("font-size", "25px")
     .attr("text-anchor", "middle")
     .text(key);

   function wrap(text, width) {
    var elements = text._parents;

    elements.forEach(function(ele) {
      var text = d3.select(ele),
          words = text.text().trim().split(/\s+/).reverse(),
          word,
          line = [],
          lineNumber = 0,
          lineHeight = .1, // em
          y = text.attr("y"),
          dy = parseFloat(text.attr("dy")),
          tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
      while (word = words.pop()) {
        line.push(word);
        tspan.text(line.join(" "));
        if (tspan.node().getComputedTextLength() > width) {
          line.pop();
          tspan.text(line.join(" "));
          line = [word];
          tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
        }
      }
    });
  }
}

function makeStackedBar(dataEnum, label, selector, yLabel) {
  var margin = {top: 50, right: 20, bottom: 30, left: 40},
    width = 600 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom,
    fullW = 600,
    fullH = 500;

  var svg = d3.select(selector)
            .append("svg")
            .attr('width', fullW)
            .attr('height', fullH);

  g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // BarChart Axes
  var x0 = d3.scaleBand()
      .rangeRound([0, width - 60])
      .paddingInner(0.1);

  // Grouping Axis
  var x1 = d3.scaleBand()
      .padding(0.5);

  // Bars
  var y = d3.scaleLinear()
      .rangeRound([height, 20]);

  //Colors
  var z = d3.scaleOrdinal()
      .range(["#F17CB0", "#60BD68", "#FAA43A", "#F15854", "#DECF3F", "#B276B2", "#B2912F"]);

  //Set Keys
  sample = dataEnum[0].value;
  keys = [];
  for (bit in sample) {
    keys.push(bit);
  }

  var sortedKeys = keys.sort();

  x0.domain(dataEnum.map(function(d) { return d.key; }));
  x1.domain(sortedKeys).rangeRound([0, x0.bandwidth()]);

  // y.domain([0, 1.25 * d3.max(dataEnum, function(d) { return d3.max(sortedKeys, function(key) { return d.value[key]; }); })]).nice();

  // caps equity ratio to 4  vs having it dynamiclly populated based on value as above.
  y.domain([0,3]);
  g.append("g")
    .selectAll("g")
    .data(dataEnum)
    .enter().append("g")
      .attr("transform", function(d) { return "translate(" + x0(d.key) + ",0)"; })
      .attr('class', "bar-chart")
    .selectAll("rect")
    .data(function(d) { return sortedKeys.map(function(key) { val = d.value[key] || .01; val = val >= 3 ? 3 : val; return {key: key, value: val} }) })
    .enter().append("rect")
      .attr('class', 'rect')
      .attr("x", function(d) { return x1(d.key); })
      .attr("y", function(d) { return y(d.value); })
      .attr("width", x1.bandwidth())
      .attr("height", function(d) { return height - y(d.value); })
      .attr("fill", function(d) { return z(d.key); })
      .enter().append("g")
      .attr("font-size", "20px")
      .data(function(d) { return sortedKeys.map(function(key) { val = d.value[key] || 0; return {key: key, value: val} }) })
      .enter().append("text")
      .text(function(d) { if (d.value == 0 || d.value >= 3) return Math.round(d.value) })
        .attr("width", x1.bandwidth())
        .attr("x", function(d) { return x1(d.key) + ((x1.bandwidth() / 2) - 3); })
        .attr("y", function(d) {
            if (d.value >=  3 ) {
                return y(3) - 10;
            } else {
                return y(d.value) - 10;
            }
        })

  g.append("g")
      .attr("class", "axis")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x0));

  g.append("g")
      .attr("class", "axis")
      .call(d3.axisLeft(y).ticks(null, "s"))
    .append("text")
      .attr("x", -5)
      .attr("y", y(y.ticks().pop()) - 10)
      .attr("dy", "0.32em")
      .attr("fill", "#000")
      .attr("font-weight", "bold")
      .attr("text-anchor", "start")
      .text(yLabel);

  g.append("line")
    .style("stroke", "black")
    .attr("x1", 0)
    .attr("y1", y(1.0))
    .attr("x2", width)
    .attr("y2", y(1.0));

  var legend = g.append("g")
      .attr("font-family", "sans-serif")
      .attr("font-size", 10)
      .attr("text-anchor", "end")
    .selectAll("g")
    .data(sortedKeys.slice())
    .enter().append("g")
      .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

  legend.append("rect")
      .attr("x", width - 25)
      .attr("width", 19)
      .attr("height", 19)
      .attr("fill", z);

  legend.append("text")
      .attr("x", width - 30)
      .attr("y", 9.5)
      .attr("dy", "0.32em")
      .text(function(d) { return d; });

    g.append("text")
      .attr("x", fullW / 2)
      .attr("y", -20)
      .attr("dy", "0.32em")
      .attr("font-weight", "bold")
      .attr("text-anchor", "middle")
      .attr("font-size", 24)
      .text(label);

}
