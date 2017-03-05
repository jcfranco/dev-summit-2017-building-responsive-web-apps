define([
  "dojo/Deferred",
  "dojo/dom-construct",
  "dojo/on",

  "esri/PopupTemplate",
  "esri/layers/FeatureLayer",
  "esri/renderers/SimpleRenderer",
  "esri/symbols/PictureMarkerSymbol",

  "require"
], function(
  Deferred, domConstruct, on,
  PopupTemplate,
  FeatureLayer,
  SimpleRenderer,
  PictureMarkerSymbol,
  require
) {

  function supportsWebGL() {
    var canvas = document.createElement("canvas");
    var gl = canvas.getContext("webgl") ||
             canvas.getContext("experimental-webgl");

    return gl && gl instanceof WebGLRenderingContext;
  }

  function get3DCapableView() {
    var def = new Deferred();
    var viewMid;

    if (supportsWebGL()) {
      viewMid = "esri/views/SceneView";
    }
    else {
      viewMid = "esri/views/MapView";
    }

    require([viewMid], function(MapView) {
      def.resolve(MapView);
    });

    return def.promise;
  }

  function getDogeFeatureLayer() {
    return new FeatureLayer({
      portalItem: {
        id: "8501b178e11646738cef89c648d3c847"
      },
      renderer: new SimpleRenderer({
        symbol: getDogeSymbol("small")
      }),
      outFields: ["Breed", "Image"],
      popupTemplate: new PopupTemplate({
        title: "{Breed} Doge",
        content: [
          {
            type: "media",
            mediaInfos: [
              {
                title: "This is what I really look like.",
                type: "image",
                value: {
                  sourceURL: "{Image}"
                }
              }
            ]
          }
        ]
      })
    });
  }

  function getDogeSymbol(type) {
    var isBig = type !== "small";
    var iconName = isBig ? "doge.gif" : "doge2.gif";
    var size = isBig ? 40 : 25;

    return new PictureMarkerSymbol({
      url: "../images/" + iconName,
      height: size,
      width: size
    });
  }

  function createTypeSelect(featureLayer) {
    var typeSelect = domConstruct.create("select", {
      className: "type-filter"
    });

    // default option
    domConstruct.create("option", {
      innerHTML: "All",
      value: "*",
      selected: true
    }, typeSelect);

    // rest
    [
      "Herding",
      "Hound",
      "Non-Sporting",
      "Sporting",
      "Terrier",
      "Toy",
      "Working"
    ]
      .forEach(function(type) {
        domConstruct.create("option", {
          innerHTML: type,
          value: type + " Group"
        }, typeSelect);
      });

    on(typeSelect, "change", function(event) {
      var selectedType = event.currentTarget.selectedOptions.item(0).value;
      updateExpression(featureLayer, "AKC_Category = '" + selectedType + "'");
    });

    return typeSelect;
  }

  function createTimeSlider(featureLayer) {
    var container = domConstruct.create("div", {
      className: "time-filter"
    });

    var dateLabel = domConstruct.create("div", {
      className: "time-filter__date-label"
    }, container);

    var timeSlider = domConstruct.create("input", {
      className: "time-filter__slider",
      type: "range",
      list: "tick-container",
      min: -8000,
      max: 2000,
      value: 2000
    }, container);

    var labelContainer = domConstruct.create("div", {
      className: "time-filter__labels"
    }, container);

    [8000, 2000].forEach(function(label) {
      domConstruct.create("div", {
        className: "time-filter__label",
        innerHTML: label
      }, labelContainer);
    });

    on(timeSlider, "input", function(event) {
      var date = event.currentTarget.value;
      updateExpression(featureLayer, "EstimatedOriginDate <= '" + date + "'");
      dateLabel.innerHTML = formatDate(date);
    });

    // force initial update
    on.emit(timeSlider, "input", {});

    return container;
  }

  function updateExpression(featureLayer, defExp) {
    var predicateParts = defExp.split(" "); // X = Y
    var hasWildCard = predicateParts[2] === "'*'";
    var currentDefExp = featureLayer.definitionExpression;

    defExp = hasWildCard ? null : defExp;

    if (!currentDefExp) {
      featureLayer.definitionExpression = defExp;
      return;
    }

    var predicateIndex = currentDefExp.indexOf(predicateParts[0]);
    var similarPredicateApplied = predicateIndex > -1;
    if (similarPredicateApplied) {
      var andIndex = currentDefExp.indexOf(" AND ");

      if (andIndex === -1) {
        featureLayer.definitionExpression = defExp;
        return;
      }

      var predicates = currentDefExp.split(" AND "); // x AND y

      // expression before AND
      if (predicateIndex < andIndex) {
        featureLayer.definitionExpression = defExp ?
                                                defExp + " AND " + predicates[1] :
                                                predicates[1];
      }
      else {
        featureLayer.definitionExpression = defExp ?
                                                predicates[0] + " AND " + defExp :
                                                predicates[0];
      }
    }
    else {
      featureLayer.definitionExpression = defExp ?
                                              currentDefExp + " AND " + defExp :
                                              currentDefExp;
    }
  }

  function formatDate(date) {
    return date < 0 ? date + " BCE" :
           date > 0 ? date + " CE" :
           date;
  }

  return {
    get3DCapableView: get3DCapableView,
    getDogeFeatureLayer: getDogeFeatureLayer,
    getDogeSymbol: getDogeSymbol,
    createTimeSlider: createTimeSlider,
    createTypeSelect: createTypeSelect
  };

});
