/**
 * Created by pablo on 2/25/2016.
 */

/* global $J, isDefinedAndTrue, isDefined, Spinner, es, console */

var scManager = (function(){

    /** Private Properties **/

    /*
    TODO: we may be able to align smState.smVals and saveDimensionSelections() values
    SM Dimension values need to be updated in the following locations:
        1. MASTER - > smState.smVals{}
        2. SLAVE - > DD_ON_LOAD{}
        3. SLAVE - > saveDimensionSelections()
     */

    var EVENT_REQUEST_DEFAULTS = {
            Scenario: false,
            Dimensions: false,
            Actuals: false,
            Assumptions: false,
            Charts: false
        },
        smState = {
            smVals: { // current SM values
                Scenario: '', // not needed in DD_ON_LOAD
                Period: '',
                Division: '',
                BusinessLine: '',
                Region: '',
                WorkforceCategory: '',
                WorkerType: '',
                FLSA: '', // a.k.a. JobGrade
                UDC1: '', // a.k.a. FunctionalGroup
                JobFunction: ''
            },
            eventTrigger: {}, // what initiated the event
            eventRequest: {}, // what are we requesting that the SM do
            ScenarioNames: [],
            DimensionsData: {},
            singleDimensionDataSuccesses: 0,
            DimensionsSelections: [],
            permitAssembleCharts: true, // permits/prevents assembleCharts from executing
            loadFailures: {} // counts data load attempt failures, keys by function name
        },
        SM_STATE_DEFAULTS = {
            eventTrigger: { // what initiated the event
                pageLoad: false
            },
            eventRequest: { // what are we requesting that the SM do
                load: EVENT_REQUEST_DEFAULTS,
                build: EVENT_REQUEST_DEFAULTS,
                refresh: EVENT_REQUEST_DEFAULTS
            }
        },
        MAX_FAILS = 3, // user prompted when max is hit
        DEFAULT_SCENARIO_NAME = 'Actual', // value for default option of Scenario dropdown
        SAVED_SCENARIO_KEY = 'sasc', // key for URL param designating which Scenario is active
        DEF_CHILD_OPT_NAME = "More specifically...", // value for default option of Dimension child dropdowns
        protectedScenarios = ['Benchmark', DEFAULT_SCENARIO_NAME], // prevent delete option for these
        spinnerOpts = { // Spinner options
            lines: 11, // The number of lines to draw
            length: 10, // The length of each line
            width: 8, // The line thickness
            radius: 20, // The radius of the inner circle
            scale: 0.5, // Scales overall size of the spinner
            corners: 1, // Corner roundness (0..1)
            color: '#000', // #rgb or #rrggbb or array of colors
            opacity: 0.25, // Opacity of the lines
            rotate: 0, // The rotation offset
            direction: 1, // 1: clockwise, -1: counterclockwise
            speed: 1, // Rounds per second
            trail: 60, // Afterglow percentage
            fps: 20, // Frames per second when using setTimeout() as a fallback for CSS
            zIndex: 2e9, // The z-index (defaults to 2000000000)
            className: 'spinner', // The CSS class to assign to the spinner
            top: '50%', // Top position relative to parent
            left: '50%', // Left position relative to parent
            shadow: false, // Whether to render a shadow
            hwaccel: false, // Whether to use hardware acceleration
            position: 'relative' // Element positioning
        },
        allowConsoleLog = true, // flag for custom console log printing
        onSelect2 = false, // prevents premature #smFilters.mouseleave events. select2 is positioned absolute-ly, so when we mouseover select2 dropdown Dimension label onMouseEnter event affects disappear
        periodYearOnly = false, // certain dashboards can only filter by year Dimension and not any more specific
        tm1CurrentYear = null, // holds the current year from TM1
        dependSelects = {}, // holds list of dependent select lists: dependSelects{ selectID-optValue:subSelectID }
        wasSelectedVal = {}, // holds previously selected value - used to clear sub-selects in case they are active: wasSelectedVal{ selectID:subSelectID }
        dimensionsResults = {}, // holds Dimensions dropdown selections web method Results JSON string
        assumptionsResults = {}, // holds Assumptions web method Results JSON string
        ddRange = [], // range of numbers for Assumptions ("% Change") dropdown options
        DISPLAY_SECTION_NAMES = { // formatting of Actuals & Assumptions Section names
            'Workforce': { displayName: 'Workforce Assumptions' },
            'Business&Financial': { displayName: 'Business & Financial' },
            'Learning': { displayName: 'Learning Dashboard' },
            'Performance&Engagement': { displayName: 'Performance & Engagement' }
        },
        /**
         config for top level dropdowns:
         resultsMembersID    = Id of web method result object member: {Results:Members:ID:Children}
         selectID            = Id of select tag, doesn't include css id hash character
         selectLabel         = label for select element
         defOptName          = default select option name/text
         methodName          = TM1 web method name
         webMParamKey1       = web method 1st parameter key, TM1 dimension name
         webMParamVal1       = web method 1st parameter value
         webMParamKey2       = web method 2nd parameter key
         webMParamVal2       = web method 2nd parameter value
         **/
        DD_ON_LOAD = {
            Period: {
                // TM1DimensionMembers?DimName=Period
                resultsMembersID: 'All Years',
                selectID: 'year',
                selectLabel: 'Period',
                defOptName: 'Current Year',
                methodName: 'TM1DimensionMembers',
                webMParamKey1: 'DimName',
                webMParamVal1: 'Period',
                webMParamKey2: 'AttrName1',
                webMParamVal2: 'DashboardName'
            },
            Division: {
                // TM1DimensionMembers?DimName=Division
                resultsMembersID: 'All Divisions',
                selectID: 'division',
                selectLabel: 'Division',
                defOptName: 'All Divisions',
                methodName: 'TM1DimensionMembers',
                webMParamKey1: 'DimName',
                webMParamVal1: 'Division',
                webMParamKey2: '',
                webMParamVal2: ''
            },
            BusinessLine: {
                // TM1DimensionMembers?DimName=Business%20Line
                resultsMembersID: 'All Business Lines',
                selectID: 'businessLine',
                selectLabel: 'Business Unit',
                defOptName: 'All Business Units',
                methodName: 'TM1DimensionMembers',
                webMParamKey1: 'DimName',
                webMParamVal1: 'Business Line',
                webMParamKey2: '',
                webMParamVal2: ''
            },
            Region: {
                // TM1DimensionMembers?DimName=Region
                resultsMembersID: 'All Countries',
                selectID: 'region',
                selectLabel: 'Geographic Location',
                defOptName: 'All Regions',
                methodName: 'TM1DimensionMembers',
                webMParamKey1: 'DimName',
                webMParamVal1: 'Region',
                webMParamKey2: '',
                webMParamVal2: ''
            },
            WorkforceCategory: {
                // TM1DimensionMembers?DimName=Workforce%20Category
                resultsMembersID: 'All Workforce Categories',
                selectID: 'workforceCategory',
                selectLabel: 'Workforce Category',
                defOptName: 'All Workforce Categories',
                methodName: 'TM1DimensionMembers',
                webMParamKey1: 'DimName',
                webMParamVal1: 'Workforce Category',
                webMParamKey2: '',
                webMParamVal2: ''
            },
            WorkerType: {
                // TM1DimensionMembers?DimName=Worker%20Type
                resultsMembersID: 'All Workers',
                selectID: 'workerType',
                selectLabel: 'Worker Type',
                defOptName: 'All Worker Types',
                methodName: 'TM1DimensionMembers',
                webMParamKey1: 'DimName',
                webMParamVal1: 'Worker Type',
                webMParamKey2: '',
                webMParamVal2: ''
            },
            FLSA: {
                // TM1DimensionMembers?DimName=FLSA
                resultsMembersID: 'All FLSA Statuses',
                selectID: 'jobGrade',
                selectLabel: 'Job Grade / Level',
                defOptName: 'All Job Grades / Levels',
                methodName: 'TM1DimensionMembers',
                webMParamKey1: 'DimName',
                webMParamVal1: 'FLSA',
                webMParamKey2: '',
                webMParamVal2: ''
            },
            UDC1: {
                // TM1DimensionMembers?DimName=UDC1
                resultsMembersID: 'All UDC1',
                selectID: 'functionalGroup',
                selectLabel: 'Functional Group',
                defOptName: 'All Functional Groups',
                methodName: 'TM1DimensionMembers',
                webMParamKey1: 'DimName',
                webMParamVal1: 'UDC1',
                webMParamKey2: '',
                webMParamVal2: ''
            },
            JobFunction: {
                // TM1DimensionMembers?DimName=Job%20Function
                resultsMembersID: 'All Job Functions',
                selectID: 'jobFunction',
                selectLabel: 'Job Function',
                defOptName: 'All Job Functions',
                methodName: 'TM1DimensionMembers',
                webMParamKey1: 'DimName',
                webMParamVal1: 'Job Function',
                webMParamKey2: '',
                webMParamVal2: ''
            }
        };

    /** Helpers **/

    function setSMStateObj(setToThisObj){
        var key,
            key2;

        for (key in SM_STATE_DEFAULTS){
            if (SM_STATE_DEFAULTS.hasOwnProperty(key)){
                for (key2 in SM_STATE_DEFAULTS[key]){
                    if (SM_STATE_DEFAULTS[key].hasOwnProperty(key2)){
                        if (typeof setToThisObj[key] === 'undefined' || typeof setToThisObj[key][key2] === 'undefined'){
                            smState[key][key2] = SM_STATE_DEFAULTS[key][key2];
                        } else {
                            smState[key][key2] = setToThisObj[key][key2];
                        }
                    }
                }
            }
        }
    }

    function modalMsg(msgType, msgItem){
        // msgType(s): 'status', 'success', 'error', 'erase'
        var fontColor,
            spinner;

        if (typeof msgType !== 'undefined'){
            fontColor = msgType === 'error' ? 'red' : 'green';
            if (msgType === 'erase'){
                $J('#overlay p').each(function() {
                    $J(this).empty();
                });
                $J('#overlay button').each(function() {
                    $J(this).hide();
                });
                $J('#overlay').hide();
            } else {
                if (msgItem instanceof Object){
                    setTimeout(function(){
                        $J('#overlay .titleD').html('<span style="color:' + fontColor + '">' + msgItem.title + '</span>');
                        if (msgItem.message) {
                            $J('#overlay .overlayMsg').html('<span style="color:' + fontColor + '">' + msgItem.message + '</span>');
                        }
                        if (!$J.isEmptyObject(msgItem.confirm)){
                            if (msgItem.spinner){
                                spinner = new Spinner(spinnerOpts).spin(document.getElementById('overlayLoading'));
                            }
                            $J('#overlayConfirmBtn').show().html(msgItem.confirm.msg).click(function(){
                                if (msgItem.confirm.funcs.length > 0){
                                    msgItem.confirm.funcs.forEach(function(item){
                                        item();
                                    });
                                }
                                $J(this).unbind('click');
                                modalMsg('erase');
                            });

                        }
                        if (!$J.isEmptyObject(msgItem.deny)){
                            $J('#overlayConfirmBtn').show().html(msgItem.deny.msg).click(function(){
                                if (msgItem.deny.funcs.length > 0){
                                    msgItem.deny.funcs.forEach(function(item){
                                        item();
                                    });
                                }
                                $J(this).unbind('click');
                                modalMsg('erase');
                            });

                        }
                        $J('#overlay').show();
                    }, 0);
                }
            }
        }
    }

    function processingMsg(){
        modalMsg('status', {
            msgItem: {
                title: 'SOLVE&trade; is Processing...',
                message: '',
                spinner: true,
                confirm: {},
                deny: {}
            }
        });
    }

    function failedToUpdateMsg(errorItemStr, cbFuncArr){
        var cbArray = cbFuncArr && cbFuncArr.length ? cbFuncArr : [];
        modalMsg('error', {
            msgItem: {
                title: 'Sorry!',
                message: errorItemStr + ' failed to update. Please try again.',
                spinner: false,
                confirm: {
                    msg: 'Try Again',
                    funcs: cbArray
                },
                deny: {}
            }
        });
    }

    function detectIE() {
        var ua = window.navigator.userAgent,
            msie,
            trident,
            edge;

        // http://codepen.io/gapcode/pen/vEJNZN
        // test values
        // IE 10
        // ua = 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0)';
        // IE 11
        // ua = 'Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko';
        // IE 12 / Spartan
        // ua = 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.71 Safari/537.36 Edge/12.0';

        msie = ua.indexOf('MSIE ');
        if (msie > 0) {
            // IE 10 or older => return version number
            // return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
            return true;
        }

        trident = ua.indexOf('Trident/');
        if (trident > 0) {
            // IE 11 => return version number
            // var rv = ua.indexOf('rv:');
            // return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
            return true;
        }

        edge = ua.indexOf('Edge/');
        if (edge > 0) {
            // IE 12 => return version number
            // return parseInt(ua.substring(edge + 5, ua.indexOf('.', edge)), 10);
            return true;
        }

        // other browser
        return false;
    }

    function expandedSM(doIt) {
        var adj = 0,
            adjForIE = detectIE() ? 30 : 0,
            width,
            expandMe = doIt || false;

        if (expandMe) {
            $J('#dimRowDropdowns').removeClass('hidden');
            adj = 100;
        }
        else {
            $J('#dimRowDropdowns').addClass('hidden');
        }
        width = [
            515 + adj + (adjForIE * 1.7),   // 0
            325 + adj + (adjForIE * 1.5),   // 1
            340 + adj + (adjForIE * 1.5),   // 2
            450 + adj + (adjForIE * 1.5),   // 3
            270 + adjForIE                  // 4
        ];

        $J('#sm').css('width', width[0] + 'px');
        $J('#sm .titleD').css('width', width[3] + 'px');
        $J('#smScenario').css('width', width[3] + 'px');
        $J('#smFilters').css('width', width[3] + 'px');
        $J('#smEntities').css('width', width[3] + 'px');
        $J('#cur-scenario-tab select').css('width', width[1] + 'px');
        $J('#cur-scenario-tab .select2-container').css('width', width[1] + 'px');
        $J('#create-scenario-name').css('width', width[2] + 'px');
        $J('#dimRowLabels').css('width', width[4] + 'px');
    }

    function getQueryParams(qs) {
        var qstr = qs.split('+').join(' '),
            params = {},
            tokens,
            re = /[?&]?([^=]+)=([^&]*)/g;

        while (tokens = re.exec(qstr)) {
            params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
        }

        return params;
    }

    function addParamsToUrl(paramsToAdd) {
        var pathName = window.location.pathname,
            qString = window.location.search,
            newQString = '',
            separator = '?',
            urlParams,
            key;

        if (qString === '') {
            for (key in paramsToAdd){
                if (paramsToAdd.hasOwnProperty(key)){
                    newQString += separator + encodeURIComponent(key) + '=' + encodeURIComponent(paramsToAdd[key]);
                    separator = '&';
                }
            }
        } else {
            urlParams = getQueryParams(qString);
            urlParams[SAVED_SCENARIO_KEY] = paramsToAdd[SAVED_SCENARIO_KEY];
            for (key in urlParams) {
                if (urlParams.hasOwnProperty(key)) {
                    newQString += separator + encodeURIComponent(key) + '=' + encodeURIComponent(urlParams[key]);
                    separator = '&';
                }
            }
        }

        window.history.pushState('', 'Modified URL', pathName + newQString);
    }

    function rewriteLinks() {
        var linksToRewrite = [
            '.powerToolsLI',
            '#navigation-menu'
        ];

        linksToRewrite.forEach(function(elem) {
            $J(elem).find('a').each(function() {
                var oldHref = $J(this).attr("href"),
                    newHref = '',
                    urlAndParams,
                    urlParams,
                    qString,
                    separator,
                    key;

                if (oldHref.indexOf('?') > -1) {
                    urlAndParams = oldHref.split('?'); // split loc & params
                    urlParams = getQueryParams(urlAndParams[1]); // check for existing 'scenario' value
                    urlParams[SAVED_SCENARIO_KEY] = smState.smVals.Scenario;
                    qString = '';
                    separator = '?';
                    for (key in urlParams) {
                        if (urlParams.hasOwnProperty(key)) {
                            qString += separator + encodeURIComponent(key) + '=' + encodeURIComponent(urlParams[key]);
                            separator = '&';
                        }
                    }
                    newHref = urlAndParams[0] + qString;
                } else {
                    newHref = oldHref + '?' + SAVED_SCENARIO_KEY + '=' + smState.smVals.Scenario;
                }

                $J(this).attr("href", newHref);
            });
        });
    }

    function formatStringSpace(thisStr) {
        // removes whitespace
        return thisStr.replace(/\s+/g, '');
    }

    function formatStringChars(thisStr) {
        // removes non-alphanumeric
        return thisStr.replace(/\W/g, '');
    }

    function clearChildSelect(idToClear) {
        var key,
            obj,
            thisSel;

        // TODO: review this
        permitAssembleCharts = false;

        // clears select with idToClear and children selects
        for (key in dependSelects) {
            if (dependSelects.hasOwnProperty(key)) {
                obj = dependSelects[key];
                if (obj.substring(0, idToClear.length) === idToClear) {
                    thisSel = $J('#' + obj);
                    thisSel.find('option:selected').removeAttr('selected');
                    thisSel.find('option:first').attr('selected', 'selected');
                    thisSel.val($J('#' + obj + 'option:first').val()).trigger('change');
                    $J('#' + obj + '-container').addClass('hidden');
                }
            }
        }

        // TODO: review this
        permitAssembleCharts = true;
    }

    function updateRunningTab(selDimid, txt) {
        $J('#rt' + selDimid).html(txt);
    }

    function updateSMDimensionVals() { // updates Dimension values (excluding Scenario) in smState.smVals
        $J('#smFilters select').each(function() { // iterate thru drop downs, pull name/value pairs
            var thisSel = $J(this),
                rtText,
                thisSeldimid = thisSel.attr('dimid'),
                thisText = thisSel.find(':selected').text(),
                thisElem;

            if (thisText !== DEF_CHILD_OPT_NAME) {
                rtText = thisText;
            }
            if (isDefinedAndTrue(thisSel.find(':selected').attr('value'))) {
                thisElem = $J(this).val(); // non-blank values will be params for TM1 web methods
                smState.smVals[thisSeldimid] = thisElem;
                rtText = thisElem;
            }
            updateRunningTab(thisSeldimid, rtText);
        });
    }

    function consoleLog(funcName, msgArr, obj, type) {
        var consoleType;

        if (allowConsoleLog) {
            consoleType = type || 'log';
            switch (consoleType) {
                case 'warn':
                    console.warn('*** ' + funcName + ' ***');
                    break;
                case 'error':
                    console.error('*** ' + funcName + ' ***');
                    break;
                case 'info':
                    console.info('*** ' + funcName + ' ***');
                    break;
                default:
                    console.log('*** ' + funcName + ' ***');
            }

            if (isDefined(msgArr)) {
                msgArr.forEach(function(value) {
                    console.log(value);
                });
            }
            if (isDefined(obj)) {
                console.log(obj);
            }
            console.log('*** ' + funcName + ' ***');
        }
    }

    function cleanNumber(value, decimalPlaces) {
        if (value === 0) {
            return 0;
        }
        else {
            // hundreds
            if (value <= 999) {
                return value;
            }
            // thousands
            else if (value >= 1000 && value <= 999999) {
                return (value / 1000).toFixed(decimalPlaces) + 'K';
            }
            // millions
            else if (value >= 1000000 && value <= 999999999) {
                return (value / 1000000).toFixed(decimalPlaces) + 'M';
            }
            // billions
            else if (value >= 1000000000 && value <= 999999999999) {
                return (value / 1000000000).toFixed(decimalPlaces) + 'B';
            }
            else {
                return value;
            }
        }
    }

    function formatActualVal(actTitle, actVal) {
        var displayRowFormat = { // formatting of Row name, and formatting of Actuals
                'Average Employee Salary': {
                    displayName: '',
                    dollarize: 1,
                    percentify: 0,
                    decimalize: 0
                },
                'Average Contingent Worker Cost': {
                    displayName: '',
                    dollarize: 1,
                    percentify: 0,
                    decimalize: 0
                },
                'Annual High Performer Salary': {
                    displayName: '',
                    dollarize: 1,
                    percentify: 0,
                    decimalize: 0
                },
                'Salary vs Market': {
                    displayName: '',
                    dollarize: 0,
                    percentify: 1,
                    decimalize: 0
                },
                'Bonus / Incentives Average': {
                    displayName: 'Bonus & Incentive Pay (Average)',
                    dollarize: 1,
                    percentify: 0,
                    decimalize: 0
                },
                'Benefits Percent': {
                    displayName: 'Benefits as a % of Salary',
                    dollarize: 0,
                    percentify: 1,
                    decimalize: 0
                },
                'Inflation Rate': {
                    displayName: 'Annual Inflation Rate',
                    dollarize: 0,
                    percentify: 1,
                    decimalize: 0
                },
                'Revenue': {
                    displayName: 'Revenue Growth',
                    dollarize: 1,
                    percentify: 0,
                    decimalize: 0
                },
                'Operating Expenses': {
                    displayName: '',
                    dollarize: 1,
                    percentify: 0,
                    decimalize: 0
                },
                'Operating Profit': {
                    displayName: '',
                    dollarize: 1,
                    percentify: 0,
                    decimalize: 0
                },
                'Total Cost of Workforce': {
                    displayName: 'Total Cost of Workforce Change Rate',
                    dollarize: 1,
                    percentify: 0,
                    decimalize: 0
                },
                'HR Costs': {
                    displayName: 'Total HR Costs',
                    dollarize: 1,
                    percentify: 0,
                    decimalize: 0
                },
                'Recruiting Cost': {
                    displayName: 'Total Recruiting Cost',
                    dollarize: 1,
                    percentify: 0,
                    decimalize: 0
                },
                'Internal Cost per Hire': {
                    displayName: '',
                    dollarize: 1,
                    percentify: 0,
                    decimalize: 0
                },
                'Internal vs External Cost per Hire': {
                    displayName: '',
                    dollarize: 1,
                    percentify: 0,
                    decimalize: 0
                },
                'High Performers Terminations': {
                    displayName: 'High Performer Terminations',
                    dollarize: 0,
                    percentify: 0,
                    decimalize: 0
                },
                'Training Cost': {
                    displayName: 'Total Training Investment',
                    dollarize: 1,
                    percentify: 0,
                    decimalize: 0
                },
                'Training Performance Differential': {
                    displayName: '',
                    dollarize: 1,
                    percentify: 0,
                    decimalize: 0
                },
                'Percent of Workforce Trained': {
                    displayName: '',
                    dollarize: 0,
                    percentify: 1,
                    decimalize: 0
                },
                'Employees with Training Prod Gains': {
                    displayName: 'Employees with Training Prod. Gains',
                    dollarize: 0,
                    percentify: 1,
                    decimalize: 0
                },
                'Satisfaction with Training': {
                    displayName: '',
                    dollarize: 0,
                    percentify: 1,
                    decimalize: 0
                },
                'Training Hours per Employee': {
                    displayName: '',
                    dollarize: 0,
                    percentify: 0,
                    decimalize: 1
                },
                'High Performers Headcount': {
                    displayName: 'High Performer Headcount',
                    dollarize: 0,
                    percentify: 0,
                    decimalize: 0
                },
                'High Performer Prod Diff': {
                    displayName: 'High Performer Productivity Diff.',
                    dollarize: 0,
                    percentify: 1,
                    decimalize: 0
                },
                'Employee Engagement': {
                    displayName: 'Employee Engagement Rate',
                    dollarize: 0,
                    percentify: 1,
                    decimalize: 0
                },
                'High Engagement Revenue': {
                    displayName: 'High Engagement Revenue Impact',
                    dollarize: 0,
                    percentify: 1,
                    decimalize: 0
                },
                'Promotion Rate': {
                    displayName: '',
                    dollarize: 0,
                    percentify: 1,
                    decimalize: 0
                },
                'Transfer Rate': {
                    displayName: '',
                    dollarize: 0,
                    percentify: 1,
                    decimalize: 0
                },
                'Percent Job Requirements Met': {
                    displayName: 'Job Requirements Met',
                    dollarize: 0,
                    percentify: 1,
                    decimalize: 0
                },
                'Time to Fill (Days)': {
                    displayName: '',
                    dollarize: 0,
                    percentify: 0,
                    decimalize: 1
                }
            },
            formattedResults = [], // [title, value]
            formatVal = null,
            name,
            dollar,
            percent,
            decimal;

        if (actTitle in displayRowFormat) {
            name = displayRowFormat[actTitle].displayName;
            dollar = displayRowFormat[actTitle].dollarize;
            percent = displayRowFormat[actTitle].percentify;
            decimal = displayRowFormat[actTitle].decimalize;

            if (name !== '') {
                actTitle = displayRowFormat[actTitle].displayName;
            }
            if (dollar) {
                formatVal = '$' + cleanNumber(parseInt(actVal), 2);
            } else if (decimal) {
                formatVal = parseFloat(actVal).toFixed(2);
            } else if (percent) {
                if (name === 'Employee Engagement Rate') {
                    formatVal = parseFloat(actVal);
                    formatVal = parseInt(formatVal) + '%';
                }
                else if (name === 'High Engagement Revenue Impact') {
                    formatVal = (parseFloat(actVal) * 100).toFixed(1) + '%';
                }
                else {
                    formatVal = parseFloat(actVal) * 100;
                    formatVal = parseInt(formatVal) + '%';
                }
            }
            else {
                formatVal = cleanNumber(actVal, 2);
            }
        }
        else {
            formatVal = cleanNumber(actVal, 2);
        }
        formattedResults.push(actTitle);
        formattedResults.push(formatVal);
        return formattedResults;
    }

    function applySelect2(applyToDDs) {
        applyToDDs.forEach(function(value) {
            switch (value) {
                case 'scenario':
                    $J('.scenarioDD').select2({
                        placeholder: 'Load a scenario..'
                    });
                    break;
                case 'dimensions':
                    $J('.dimensionDD').select2();
                    break;
                case 'assumptions':
                    function matchStart(term, text) {
                        return text.toUpperCase().indexOf(term.toUpperCase()) === 0;
                    }
                    $J.fn.select2.amd.require(['select2/compat/matcher'], function(oldMatcher) {
                        $J('.varPercent').select2({
                            matcher: oldMatcher(matchStart)
                        });
                    });
                    break;
                default:
                // do nothing
            }
        });
    }

    function getTM1CurrentYear() {
        var params = { // web method: TM1SubsetMembers?DimName=Period&SubsetName=Current
                "DimName": "Period",
                "SubsetName": "Current"
            },
            onSuccess,
            onFailure;

        onSuccess = function(resultObj) {
            tm1CurrentYear = resultObj.Results.Members[0].ID;
        };

        onFailure = function() {
            getTM1CurrentYear();
        };

        es.get("TM1SubsetMembers", params, onSuccess, onFailure, true);
    }

    function createNewScenario(newScenarioNameStr) {
        // *** test if new name is unique ***
        // **********************************
        var params = { "DimName": "Scenario" }, // web method: TM1DimensionMembers?DimName=Scenario
            testPassed = true,
            failureMessage,
            onSuccess,
            onFailure;

        failureMessage = function(){
            var recursiveCall = function(){
                createNewScenario(newScenarioNameStr);
            };

            if (smState.loadFailures.createNewScenario < MAX_FAILS){
                (smState.loadFailures.createNewScenario)++;
                createNewScenario(newScenarioNameStr);
            } else {
                modalMsg('erase');
                modalMsg('error', {
                    msgItem: {
                        title: 'Sorry!',
                        message: 'We experienced a temporary challenge creating a new Scenario. Please try again.',
                        spinner: false,
                        confirm: {
                            msg: 'Try Again',
                            funcs: [recursiveCall]
                        },
                        deny: {}
                    }
                });
                smState.loadFailures.createNewScenario = 0;
            }
        };

        onSuccess = function(resultObj) {
            smState.loadFailures.createNewScenario = 0;
            resultObj.Results.Members.forEach(function(value) {
                if (value.Name === newScenarioNameStr) {
                    modalMsg('erase');
                    modalMsg('error', {
                        msgItem: {
                            title: 'Sorry!',
                            message: 'The proposed Scenario name already exists. Please choose another name.',
                            spinner: false,
                            confirm: {
                                msg: 'Continue',
                                funcs: []
                            },
                            deny: {}
                        }
                    });
                    testPassed = false;
                }
            });

            // *** create new Scenario ***
            // ***************************
            if (testPassed) {
                var params = { "p_element": newScenarioNameStr }, // web method: ScenarioElementInsert?p_element=newScenarioNameStr
                    onSuccess,
                    onFailure;

                modalMsg('erase');
                modalMsg('success', {
                    msgItem: {
                        title: 'Creating New Scenario',
                        message: 'A new Scenario is being created. This may take a moment.',
                        spinner: true,
                        confirm: {},
                        deny: {}
                    }
                });

                onSuccess = function() {
                    smState.loadFailures.createNewScenario = 0;
                    modalMsg('erase');
                    modalMsg('success', {
                        msgItem: {
                            title: 'Success',
                            message: 'Scenario "' + newScenarioNameStr + '" was created.',
                            spinner: false,
                            confirm: {
                                msg: 'Ok',
                                funcs: []
                            },
                            deny: {}
                        }
                    });
                    setScenarioStateAndUrl(newScenarioNameStr);
                    init(); // re-initialize
                };

                onFailure = failureMessage();

                es.get("ScenarioElementInsert", params, onSuccess, onFailure, true, "json", 120000, "There is still no response from the server. Do you want to abort the request?", 120000);
            }
        };

        onFailure = failureMessage();

        es.get("TM1DimensionMembers", params, onSuccess, onFailure, true);
    }

    function scenarioDeleteConfirmed(){
        var params  = { "DimName": "Scenario", "MemberID": smState.smVals.Scenario }, // web method: TM1DimensionDeleteMember?DimName=Scenario&MemberID=Test
            onSuccess,
            onFailure;

        modalMsg('erase');
        modalMsg('status', {
            msgItem: {
                title: 'Deleting Scenario',
                message: 'Scenario ' + smState.smVals.Scenario + ' is being deleted. This may take a moment.',
                spinner: true,
                confirm: {},
                deny: {}
            }
        });

        smState.loadFailures.scenarioDeleteConfirmed = smState.loadFailures.scenarioDeleteConfirmed || 0;

        onSuccess = function() {
            smState.loadFailures.scenarioDeleteConfirmed = 0;
            modalMsg('erase');
            modalMsg('success', {
                msgItem: {
                    title: 'Success',
                    message: 'Scenario ' + smState.smVals.Scenario + ' was successfully deleted.',
                    spinner: false,
                    confirm: {
                        msg: 'Ok',
                        funcs: []
                    },
                    deny: {}
                }
            });

            setScenarioStateAndUrl(DEFAULT_SCENARIO_NAME); // set to default Scenario
            init(); // re-initialize
        };

        onFailure = function() {
            if (smState.loadFailures.scenarioDeleteConfirmed < MAX_FAILS){
                (smState.loadFailures.scenarioDeleteConfirmed)++;
                scenarioDeleteConfirmed();
            } else {
                modalMsg('erase');
                modalMsg('error', {
                    msgItem: {
                        title: 'Delete Failed',
                        message: 'Scenario ' + smState.smVals.Scenario + ' failed to delete.',
                        spinner: false,
                        confirm: {
                            msg: 'Try Again',
                            funcs: [scenarioDeleteConfirmed]
                        },
                        deny: {}
                    }
                });
                smState.loadFailures.scenarioDeleteConfirmed = 0;
            }
        };

        es.get("TM1DimensionDeleteMember", params, onSuccess, onFailure, true);
    }

    function saveDimensionSelections() {
        var localDimResults = $J.extend(true, {}, dimensionsResults),
            dimRows = localDimResults.RowSet.Rows[0],
            key,
            onSuccess,
            onFailure;

        /* TODO: see if you can align the dimRows values below with smState.smVals and DD_ON_LOAD */

        for (key in dimRows) {
            if (dimRows.hasOwnProperty(key)) {
                switch (key) {
                    case 'Scenario':
                        dimRows.Scenario = smState.smVals.Scenario;
                        break;
                    case 'SelectedYear':
                        dimRows.SelectedYear = smState.smVals.Period ? smState.smVals.Period : DD_ON_LOAD.Period.resultsMembersID;
                        break;
                    case 'SelectedLegalEntity':
                        dimRows.SelectedLegalEntity = smState.smVals.Division ? smState.smVals.Division : DD_ON_LOAD.Division.resultsMembersID;
                        break;
                    case 'SelectedBusinessUnit':
                        dimRows.SelectedBusinessUnit = smState.smVals.BusinessLine ? smState.smVals.BusinessLine : DD_ON_LOAD.BusinessLine.resultsMembersID;
                        break;
                    case 'SelectedRegion':
                        dimRows.SelectedRegion = smState.smVals.Region ? smState.smVals.Region : DD_ON_LOAD.Region.resultsMembersID;
                        break;
                    case 'SelectedWorkforceCategory':
                        dimRows.SelectedWorkforceCategory = smState.smVals.WorkforceCategory ? smState.smVals.WorkforceCategory : DD_ON_LOAD.workforceCategory.resultsMembersID;
                        break;
                    case 'SelectedWorkerType':
                        dimRows.SelectedWorkerType = smState.smVals.WorkerType ? smState.smVals.WorkerType : DD_ON_LOAD.WorkerType.resultsMembersID;
                        break;
                    case 'SelectedJobGrade':
                        dimRows.SelectedJobGrade = smState.smVals.FLSA ? smState.smVals.FLSA : DD_ON_LOAD.FLSA.resultsMembersID;
                        break;
                    case 'SelectedFunctionalGroup':
                        dimRows.SelectedFunctionalGroup = smState.smVals.UDC1 ? smState.smVals.UDC1 : DD_ON_LOAD.UDC1.resultsMembersID;
                        break;
                    case 'SelectedJobFunction':
                        dimRows.SelectedJobFunction = smState.smVals.JobFunction ? smState.smVals.JobFunction : DD_ON_LOAD.JobFunction.resultsMembersID;
                        break;
                    default:
                        consoleLog('saveDimensionSelections', ['Error on switch! Case not met for - ' + key], null, 'error');
                }
            }
        }
        /*
         TODO: Test this func without the following assignment. I don't think that it is needed.
         object should be passed by reference
         localDimResults.RowSet.Rows[0] = dimRows;
         */

        smState.loadFailures.saveDimensionSelections = smState.loadFailures.saveDimensionSelections || 0;

        onSuccess = function() {
            smState.loadFailures.saveDimensionSelections = 0;
            modalMsg('erase');
            modalMsg('success', {
                msgItem: {
                    title: 'Success',
                    message: 'Scenario "' + smState.smVals.Scenario + '" was updated.',
                    spinner: false,
                    confirm: {
                        msg: 'Ok',
                        funcs: []
                    },
                    deny: {}
                }
            });
        };

        onFailure = function() {
            if (smState.loadFailures.saveDimensionSelections < MAX_FAILS){
                (smState.loadFailures.saveDimensionSelections)++;
                saveDimensionSelections();
            } else {
                modalMsg('erase');
                failedToUpdateMsg('Scenario "' + smState.smVals.Scenario + '"', [saveDimensionSelections, processingMsg]);
                smState.loadFailures.saveDimensionSelections = 0;
            }
        };

        $J.ajax({
            type: "POST",
            data: JSON.stringify(localDimResults),
            cache: false,
            url: es3 + "json/TM1ViewWrite",
            error: onFailure,
            success: onSuccess
        });
    }

    function saveAssumptions() {
        var saveToCompany = 'unassigned',
            view,
            resultsRows,
            assumptionsDDVals = [],
            count = 0,
            key,
            onSuccess,
            onFailure;

        if (smState.smVals.Scenario === DEFAULT_SCENARIO_NAME) {
            modalMsg('erase');
            modalMsg('error', {
                msgItem: {
                    title: 'Sorry!',
                    message: 'You can not save to the default Scenario that is currently selected. Please choose another Scenario.',
                    spinner: false,
                    confirm: {
                        msg: 'Try Again',
                        funcs: []
                    },
                    deny: {}
                }
            });
            return;
        }

        // set to var set in getAssumptions()
        view = assumptionsResults;
        view.TitleDimensions.Scenario.ID = smState.smVals.Scenario;
        view.TitleDimensions.Scenario.Name = smState.smVals.Scenario;
        view.TitleDimensions.Company.ID = saveToCompany;
        view.TitleDimensions.Company.Name = saveToCompany;
        resultsRows = view.RowSet.Rows;

        // get Assumptions vals from SM
        $J('.varPercent').each(function() {
            assumptionsDDVals.push($J(this).val());
        });

        // set Assumptions vals in object before post
        for (key in resultsRows) {
            if (resultsRows.hasOwnProperty(key)) {
                resultsRows[key].AnalysisYear = assumptionsDDVals[count] / 100;
                count++;
            }
        }
        view.RowSet.Rows = resultsRows;

        smState.loadFailures.saveAssumptions = smState.loadFailures.saveAssumptions || 0;

        onSuccess = function() {
            smState.loadFailures.saveAssumptions = 0;
        };

        onFailure = function() {
            if (smState.loadFailures.saveAssumptions < MAX_FAILS){
                (smState.loadFailures.saveAssumptions)++;
                saveAssumptions();
            } else {
                modalMsg('erase');
                failedToUpdateMsg('The assumptions/projection change just made ', [saveDimensionSelections, processingMsg]);
                smState.loadFailures.saveAssumptions = 0;
            }
        };

        $J.ajax({
            type: "POST",
            data: JSON.stringify(view),
            cache: false,
            url: es3 + "json/TM1ViewWrite",
            error: onFailure,
            success: onSuccess
        });
    }

    function reprintActuals() {
        loadActuals();
        /* TODO: fix this! */
        /*$J('.actualVal').each(function(index) {
            var formattedVal = formatActualVal(smState.actualsArr[index][0], smState.actualsArr[index][2]);
            $J(this).html(formattedVal[1]);
        });*/
    }

    /** Data Loads **/

    function loadCurrScenarioData(cb) {
        var params = { "DimName": "Scenario"}, // web method: TM1DimensionMembers?DimName=Scenario
            webMethod = 'TM1DimensionMembers',
            savedScenarioNames = [],
            onSuccess,
            onFailure;

        smState.loadFailures.loadCurrScenarioData = smState.loadFailures.loadCurrScenarioData || 0;

        onSuccess = function(resultObj) {
            smState.loadFailures.loadCurrScenarioData = 0;
            resultObj.Results.Members.forEach(function(value) {
                savedScenarioNames.push(value.Name);
            });
            savedScenarioNames.sort();
            smState.ScenarioNames = savedScenarioNames;
            cb();
        };

        onFailure = function() {
            var recursiveCall = function(){
                loadCurrScenarioData(cb);
            };

            if (smState.loadFailures.loadCurrScenarioData < MAX_FAILS){
                (smState.loadFailures.loadCurrScenarioData)++;
                loadCurrScenarioData(cb);
            } else {
                modalMsg('erase');
                failedToUpdateMsg('The "Current Scenario" drop down', [recursiveCall]);
                smState.loadFailures.loadCurrScenarioData = 0;
            }
        };

        es.get(webMethod, params, onSuccess, onFailure, true);
    }

    function loadSingleDimensionData(cb, method, parameters){
        var formattedName = formatStringSpace(parameters.DimName),
            failureName = 'dimension' + formattedName,
            onSuccess,
            onFailure;

        smState.loadFailures[failureName] = smState.loadFailures[failureName] || 0;

        onSuccess = function(resultObj) {
            var formattedName = formatStringSpace(resultObj.Results.DimName);

            smState.loadFailures[failureName] = 0;
            smState.DimensionsData[formattedName] = resultObj;
            (smState.singleDimensionDataSuccesses)++;
            if (smState.singleDimensionDataSuccesses === Object.keys(DD_ON_LOAD).length){
                smState.singleDimensionDataSuccesses = 0;
                cb();
            }
        };

        onFailure = function() {
            var recursiveCall = function(){
                    loadSingleDimensionData(cb, method, parameters);
                };

            if (smState.loadFailures[failureName] < MAX_FAILS){
                (smState.loadFailures[failureName])++;
                loadSingleDimensionData(cb, method, parameters);
            } else {
                modalMsg('erase');
                failedToUpdateMsg('The ' + parameters.DimName + ' drop down', [recursiveCall]);
                smState.loadFailures[failureName] = 0;
            }
        };

        // TODO: async = true, then work on value collisions
        es.get(method, parameters, onSuccess, onFailure, false);
    }

    function loadDimensionsData(cb) {
        var key,
            params = {};

        for (key in DD_ON_LOAD){ // create this first so that "counter" is accurate in loadSingleDimensionData
            if (DD_ON_LOAD.hasOwnProperty(key)) {
                smState.DimensionsData[key] = {};
            }
        }

        for (key in DD_ON_LOAD) {
            if (DD_ON_LOAD.hasOwnProperty(key)) {
                params[DD_ON_LOAD[key].webMParamKey1] = DD_ON_LOAD[key].webMParamVal1;
                if (DD_ON_LOAD[key].webMParamKey2) {
                    params[DD_ON_LOAD[key].webMParamKey2] = DD_ON_LOAD[key].webMParamVal2;
                }
                loadSingleDimensionData(cb, DD_ON_LOAD[key].methodName, params);
            }
        }
    }

    function loadDimensionSelections(cb) {
        var params = {},
            webMethod = "ScenarioManager", // web method: ScenarioManager?Scenario=Actual
            onSuccess,
            onFailure;

        smState.loadFailures.loadDimensionSelections = smState.loadFailures.loadDimensionSelections || 0;

        onSuccess = function(resultObj) {
            smState.loadFailures.loadDimensionSelections = 0;
            var dimensionsRows = resultObj.Results.RowSet.Rows,
                rowKey = 0,
                key,
                dimensionArr = [ // get saved Dimension selections
                    dimensionsRows[rowKey].SelectedYear,
                    dimensionsRows[rowKey].SelectedLegalEntity,
                    dimensionsRows[rowKey].SelectedBusinessUnit,
                    dimensionsRows[rowKey].SelectedRegion,
                    dimensionsRows[rowKey].SelectedWorkforceCategory,
                    dimensionsRows[rowKey].SelectedWorkerType,
                    dimensionsRows[rowKey].SelectedJobGrade,
                    dimensionsRows[rowKey].SelectedFunctionalGroup,
                    dimensionsRows[rowKey].SelectedJobFunction
                ];

            dimensionsResults = resultObj.Results; // save copy of Results JSON for post via saveDimensionSelections()

            dimensionArr.forEach(function(value, index) {
                for (key in DD_ON_LOAD) {
                    if (DD_ON_LOAD.hasOwnProperty(key)) {
                        if (value === DD_ON_LOAD[key].resultsMembersID && DD_ON_LOAD[key].resultsMembersID !== DD_ON_LOAD[key].defOptName) {
                            dimensionArr[index] = DD_ON_LOAD[key].defOptName; // intention is to display default value, but we must display custom default value, i.e. not 'All Years' but 'Current Year'
                        }
                    }
                }
            });
            smState.DimensionsSelections = dimensionArr;
            cb();
        };

        onFailure = function() {
            var recursiveCall = function(){
                loadDimensionSelections(cb);
            };

            if (smState.loadFailures.loadDimensionSelections < MAX_FAILS){
                (smState.loadFailures.loadDimensionSelections)++;
                loadDimensionSelections(cb);
            } else {
                modalMsg('erase');
                failedToUpdateMsg('Some of the data', [recursiveCall]);
                smState.loadFailures.loadDimensionSelections = 0;
            }
        };

        params.Scenario = smState.smVals.Scenario;
        es.get(webMethod, params, onSuccess, onFailure, false);
    }

    function loadActuals(cb) {
        var webMethod = "ScenarioManagerActuals", // web method: ScenarioManagerActuals
            tempArr = [],
            onSuccess,
            onFailure;

        smState.loadFailures.loadActuals = smState.loadFailures.loadActuals || 0;

        onSuccess = function(resultObj) {
            var actuals = resultObj.Results.RowSet.Rows,
                key,
                actSect,
                actTitle,
                actVal;

            smState.loadFailures.loadActuals = 0;

            for (key in actuals) {
                if (actuals.hasOwnProperty(key)) {
                    actSect = actuals[key].ScenarioManagerActualsSection;
                    actTitle = actuals[key].ScenarioManagerActuals;
                    actTitle = actTitle.replace(' Actual', '');
                    actVal = actuals[key].AllUDC2;
                    tempArr.push([actTitle, actSect, actVal]);
                }
            }
            cb(tempArr);
        };

        onFailure = function() {
            if (smState.loadFailures.loadActuals < MAX_FAILS){
                (smState.loadFailures.loadActuals)++;
                loadActuals(cb);
            } else {
                modalMsg('erase');
                failedToUpdateMsg('The actual/current data', [loadActuals]);
                smState.loadFailures.loadActuals = 0;
            }
        };

        es.get(webMethod, smState.smVals, onSuccess, onFailure, true);
    }

    function loadAssumptions(cb) {
        var webMethod = "ScenarioAssumptionsChange", // web method: ScenarioAssumptionsChange
            params = {},
            tempArr = [],
            onSuccess,
            onFailure;

        smState.loadFailures.loadAssumptions = smState.loadFailures.loadAssumptions || 0;

        onSuccess = function(resultObj) {
            var assumptions = resultObj.Results.RowSet.Rows,
                assSect,
                assTitle,
                assVal;

            smState.loadFailures.loadAssumptions = 0;
            assumptionsResults = resultObj.Results;

            assumptions.forEach(function(item, index){
                assSect = assumptions[index].ScenarioAssumptionSection;
                assTitle = assumptions[index].ScenarioAssumption;
                assTitle = assTitle.replace(' Change Percent', '');
                assVal = assumptions[index].AnalysisYear;
                tempArr.push([assTitle, assSect, assVal]);
            });

            /* TODO: remove
            for (key in assumptions) {
                if (assumptions.hasOwnProperty(key)) {
                    assTitle = assumptions[key].ScenarioAssumption;
                    assTitle = assTitle.replace(' Change Percent', '');
                    assVal = assumptions[key].AnalysisYear;
                    tempArr.push([assTitle, assVal]);
                }
            }*/

            cb(tempArr);
        };

        onFailure = function() {
            if (smState.loadFailures.loadAssumptions < MAX_FAILS){
                (smState.loadFailures.loadAssumptions)++;
                loadAssumptions(cb);
            } else {
                modalMsg('erase');
                failedToUpdateMsg('The projection/assumption data', [loadAssumptions]);
                smState.loadFailures.loadAssumptions = 0;
            }

        };

        params.Scenario = smState.smVals.Scenario;
        es.get(webMethod, params, onSuccess, onFailure, true);
    }

    /** Build Components **/

    function buildCurrScenarioDD() {
        var selectCurrScenario = $J('#curScenarioSel'),
            optionStr = '',
            selectedValue;

        smState.ScenarioNames.forEach(function(value) {
            optionStr = '<option value="' + value + '"';
            if (value === smState.smVals.Scenario) {
                optionStr += 'selected="selected"';
                selectedValue = value;
            }
            optionStr += '>' + value + '</option>';
            selectCurrScenario.append(optionStr);
        });

        if (selectedValue){
            // trigger change so that it registers with select2
            selectCurrScenario.val(selectedValue).trigger('change', selectedValue);
            selectCurrScenario.next().find('.select2-selection__rendered').text(selectedValue);
        }
    }

    function iterateDimChildren(childObj, obj, aParID, isPeriodChildAttr) {
        var sortOptions = [],
            parID = isDefinedAndTrue(aParID) ? aParID : '',
            dimNameAsKey = formatStringSpace(obj.webMParamVal1),
            selectCurrScenario,
            setOptText,
            optionText,
            dimDDText = { // format Dimension dropdown labels/text
                // i.e. 'Management & Senior Leadership': 'Mgmt and Senior Leadership'
            };

        $J('#' + dimNameAsKey).append('<div class="clear-fix hidden" id="' + obj.selectID + '-container"><select name="' + obj.selectID + '" size="1" class="dimensionDD" id="' + obj.selectID + '" dimid="' + dimNameAsKey + '" parid="' + parID + '"></select></div>');
        selectCurrScenario = $J('#' + obj.selectID);
        setOptText = isDefinedAndTrue(obj.defOptName) ? obj.defOptName : DEF_CHILD_OPT_NAME;
        selectCurrScenario.empty().append('<option value="" selected="selected">' + setOptText + '</option>');

        childObj.forEach(function(value) {
            var valueToAdd = isPeriodChildAttr ? value.Attributes[0].Value : value.Name,
                hasChildren = value.Children,
                yearOnly = periodYearOnly && obj.resultsMembersID === DD_ON_LOAD.Period.resultsMembersID,
                childObj,
                selIdOptVal;

            sortOptions.push(valueToAdd);

            if (isDefinedAndTrue(hasChildren) && hasChildren.length > 0 && !yearOnly) {
                childObj = {};
                childObj.webMParamVal1 = dimNameAsKey;
                childObj.selectID = obj.selectID + formatStringChars(valueToAdd);
                childObj.resultsMembersID = null;
                parID = obj.selectID;
                // add dependency of selects to dependSelects object
                selIdOptVal = obj.selectID + '-' + formatStringChars(valueToAdd);
                dependSelects[selIdOptVal] = childObj.selectID;
                // let's do it again, same for child as parent
                iterateDimChildren(hasChildren, childObj, parID, isPeriodChildAttr);
            }
        });
        for (var i = 0, arrLen = sortOptions.length; i < arrLen; i++) {
            optionText = sortOptions[i];
            // uncomment to format Dimension dropdown option TEXT
            // if (optionText in dimDDText) {
            //     optionText = dimDDText[optionText];
            // }
            selectCurrScenario.append('<option value="' + sortOptions[i] + '">' + optionText + '</option>');
        }
    }

    function buildDimensionsDD() {
        var key;

        for (key in DD_ON_LOAD){
            if (DD_ON_LOAD.hasOwnProperty(key)) {
                $J('#dimRowLabels').append('<div class="dimRowLabel" dimid="' + formatStringSpace(DD_ON_LOAD[key].webMParamVal1) + '" ddid="' + DD_ON_LOAD[key].selectID + '">' + DD_ON_LOAD[key].defOptName + '</div>');
                $J('#dimRowDropdowns').append('<div class="clear-fix varSelect" id="' + formatStringSpace(DD_ON_LOAD[key].webMParamVal1) + '"></div>');
                smState.DimensionsData[key].Results.Members.forEach(function(value) {
                    if (value.ID === DD_ON_LOAD.Period.resultsMembersID) { // if this == period, then parse differently
                        iterateDimChildren(value.Children, DD_ON_LOAD[key], null, true);
                    } else if (value.ID === DD_ON_LOAD[key].resultsMembersID) {
                        iterateDimChildren(value.Children, DD_ON_LOAD[key], null, false);
                    }
                });
            }
        }
    }

    function buildAssumptionDD(actTitle, assVal) {
        var rangeStart = -200,
            rangeEnd = 200,
            percentified = (parseFloat(assVal) * 100).toFixed(0),
            returnStr = '<select name="' + actTitle + '" class="varPercent">';

        if (ddRange.length === 0){
            do {
                ddRange.push(rangeStart);
                rangeStart++;
            } while (rangeStart <= rangeEnd);
        }

        ddRange.forEach(function(value) {
            returnStr += '<option value="' + value + '"';
            if (value.toString() === percentified) {
                returnStr += ' selected="selected"';
            }
            returnStr += '>' + value + '%</option>';
        });
        returnStr += '</select>';
        return returnStr;
    }

    function buildAssumptions(assumptionsArr) {
        var actualsExist,
            i = 0,
            newSectionTitle,
            arrSectionTitle,
            savedActVal,
            arrAssTitle,
            arrAssVal;

        actualsExist = $J('#smEntities .actualVal').first().text() !== '' ? $J('#smEntities .actualVal') : null;
        if (actualsExist){
            $J('#smEntities').empty();
        }

        newSectionTitle = '';
        while (i < assumptionsArr.length) {
            arrSectionTitle = assumptionsArr[i][1];
            if (arrSectionTitle !== newSectionTitle) { // if new Section title found, print
                newSectionTitle = arrSectionTitle;
                if (arrSectionTitle in DISPLAY_SECTION_NAMES) {
                    arrSectionTitle = DISPLAY_SECTION_NAMES[arrSectionTitle].displayName;
                }
                $J('#smEntities').append('<div class="sectContainer"><p class="sectTitle">+ ' + arrSectionTitle + '</p><table border="0"><thead><tr><th class="varGroupTH">- ' + arrSectionTitle + '</th><th class="varGroupVal">Actual</th><th class="varGroupVal">% Change</th></tr></thead><tbody></tbody></table></div>');
            }

            // add rows to Section
            savedActVal = actualsExist ? actualsExist.eq(i).text() : '';
            arrAssTitle = assumptionsArr[i][0];
            arrAssVal = assumptionsArr[i][2];

            $J('#smEntities div:last-child table tbody').append('<tr><td class="varLabelTD">' + arrAssTitle + '</td><td class="actualVal">' + savedActVal + '</td><td class="assumptionVal">' + buildAssumptionDD(arrAssTitle, arrAssVal) + '</td></tr>');
            i++;
        }
    }

    function buildActuals(actualsArr) {
        var assumptionsExist,
            i = 0,
            newSectionTitle,
            arrSectionTitle,
            arrActTitle,
            arrActVal,
            savedAssVal,
            formattedResult;

        assumptionsExist = $J('#smEntities .assumptionVal').first().has('select').length ? $J('#smEntities .assumptionVal') : null;
        if (assumptionsExist){
            $J('#smEntities').empty();
        }

        newSectionTitle = '';
        while (i < actualsArr.length) {
            arrSectionTitle = actualsArr[i][1];
            if (arrSectionTitle !== newSectionTitle) { // if new Section title found, print
                newSectionTitle = arrSectionTitle;
                if (arrSectionTitle in DISPLAY_SECTION_NAMES) {
                    arrSectionTitle = DISPLAY_SECTION_NAMES[arrSectionTitle].displayName;
                }
                $J('#smEntities').append('<div class="sectContainer"><p class="sectTitle">+ ' + arrSectionTitle + '</p><table border="0"><thead><tr><th class="varGroupTH">- ' + arrSectionTitle + '</th><th class="varGroupVal">Actual</th><th class="varGroupVal">% Change</th></tr></thead><tbody></tbody></table></div>');
            }

            // add rows to Section
            arrActTitle = actualsArr[i][0];
            arrActVal = actualsArr[i][2];
            savedAssVal = assumptionsExist ? assumptionsExist.eq(i).html() : '';

            formattedResult = formatActualVal(arrActTitle, arrActVal);
            $J('#smEntities div:last-child table tbody').append('<tr><td class="varLabelTD">' + formattedResult[0] + '</td><td class="actualVal">' + formattedResult[1] + '</td><td class="assumptionVal">' + savedAssVal + '</td></tr>');
            i++;
        }
    }

    /** Set & Display Components **/

    function showDimensionSelections() {
        var key,
            savedSelectVal,
            index = 0,
            thisOption;

        for (key in DD_ON_LOAD){
            if (DD_ON_LOAD.hasOwnProperty(key)){
                clearChildSelect(DD_ON_LOAD[key].selectID); // reset dropdowns first
                savedSelectVal = smState.DimensionsSelections[index]; // get saved Option value
                $J('#' + formatStringSpace(DD_ON_LOAD[key].webMParamVal1)).find('option').each(function() {
                    thisOption = $J(this);
                    if (thisOption.text() === savedSelectVal) {
                        showIndDimSelection(thisOption);
                    }
                });
                index++;
            }
        }
    }

    function showIndDimSelection(selectedOption) {
        var thisClosestSelect = selectedOption.closest('select'),
            thisParID = thisClosestSelect.attr('parid'),
            curSelectOpt,
            containerDivID;

        if (thisParID !== '') {
            for (var key in dependSelects) {
                if (dependSelects.hasOwnProperty(key)) {
                    if (dependSelects[key] === thisClosestSelect.attr('id')) {
                        var parentSelectVal = key.split('-')[1];

                        $J('#' + thisParID).find('option').each(function() {
                            var thisParOption = $J(this),
                                thisParOptionText = formatStringChars(thisParOption.text());

                            if (thisParOptionText === parentSelectVal) {
                                showIndDimSelection(thisParOption);
                            }
                        });
                    }
                }
            }
        }
        curSelectOpt = thisClosestSelect.find('option:selected');
        if (curSelectOpt.text() !== selectedOption.text()) {
            curSelectOpt.removeAttr('selected'); // clear current "selected"
            selectedOption.attr('selected', 'selected'); // set new "selected" option

            // permitAssembleCharts = false;

            // trigger change so that it registers with select2
            thisClosestSelect.val(selectedOption.text()).trigger('change', selectedOption.text());
            thisClosestSelect.next().find('.select2-selection__rendered').text(selectedOption.text());
        }
        containerDivID = thisClosestSelect.attr('id');
        $J('#' + containerDivID + '-container').removeClass('hidden'); // show container div

        // permitAssembleCharts = true;
    }

    function collapseActualsAndAssumptions() {
        $J('#smEntities table').toggle();
        $J('#smEntities p').click(function() {
            $J(this).closest('.sectContainer').find('table').toggle();
            $J(this).toggle();
        });
        $J('#smEntities th.varGroupTH').click(function() {
            $J(this).closest('.sectContainer').find('table').toggle();
            $J(this).closest('.sectContainer').find('p.sectTitle').toggle();
        });
    }

    function repositionVarSelect(divID) {
        var divJ = $J('#dimRowDropdowns').children('#' + divID),
            curTop,
            drl,
            baseTop,
            newTop;

        divJ.css({ 'position': 'relative', 'top': '0px', 'left': '0px' });
        if ($J('.dimRowLabelFocus').length > 0){
            curTop = $J('.dimRowLabelFocus').position().top;
            drl = $J('#dimRowLabels');
            baseTop = drl.position().top;
            newTop = (curTop - baseTop) + divJ.height() > drl.height() ?
            drl.height() - divJ.height() - 1 :
            curTop - baseTop;
            divJ.css({ 'position': 'relative', 'top': newTop + 'px', 'left': '0px' });
        }
    }

    /** Events & UX **/

    function adjustTabForScenario(){
        $J('#new-scenario-tab').hide();
        $J('#cur-scenario-tab').show();
        if (protectedScenarios.indexOf(smState.smVals.Scenario) !== -1){
            $J('#cur-scenario-tab-btns').hide();
        } else {
            $J('#cur-scenario-tab-btns').css('display', 'inline-block');
        }
    }

    function setScenarioStateAndUrl(scName){
        var urlParamsObj = {};

        smState.smVals.Scenario = scName;
        urlParamsObj[SAVED_SCENARIO_KEY] = smState.smVals.Scenario;
        addParamsToUrl(urlParamsObj);
        rewriteLinks();
        adjustTabForScenario();
    }

    function adjustSMPanel(){
        $J(window).scroll(function() {
            var bodyHeight = $J('#body').height();
            if (bodyHeight > $J('.smOpenD').height()) {
                $J('.smOpenD').height(bodyHeight);
                $J('.smCloseD').height(bodyHeight);
                $J('#sm').height(bodyHeight - 34);
            }
        });

        $J('#sm').scroll(function() {
            if (($J('#sm')[0].scrollHeight - $J('.smCloseD').height()) > 19) {
                $J('.smCloseD').height($J('#sm')[0].scrollHeight);
            }
        });
    }

    function sectionScenariosEvents() {
        var nameInput = $J('#create-scenario-name'),
            defVal = '',
            errorVal = 'Please enter a name';

        // *** Current Scenario ***
        // ************************
        $J('#select-toggle-btn').click(function() {
            $J('#new-scenario-tab').hide();
            $J('#cur-scenario-tab').show();
            $J('#smFilters').show();
            $J('#smEntities').show();
        });

        // *** Create Scenario ***
        // ***********************
        $J('#create-toggle-btn').click(function() {
            $J('#smFilters').hide();
            $J('#smEntities').hide();
            $J('#cur-scenario-tab').hide();
            $J('#new-scenario-tab').show();
        });

        nameInput.click(function() {
            nameInput.val(defVal).css('color', '#000');
            if (nameInput.val() === defVal || nameInput.val() === errorVal) {
                $J(this).val('');
            }
        });

        $J('#create-scenario-btn').click(function() {
            if (nameInput.val() === '' || nameInput.val() === defVal) {
                nameInput.val(errorVal).css('color', 'red');
            }
            else {
                createNewScenario(nameInput.val());
            }
        });

        // *** Update Scenario ***
        // ***********************
        $J('#update-scenario-btn').click(function() {
            saveDimensionSelections();
        });

        // *** Delete Scenario ***
        // ***********************
        $J('#delete-scenario-btn').click(function() {
            modalMsg('erase');
            modalMsg('status', {
                msgItem: {
                    title: 'Confirm Delete',
                    message: 'Are you sure you want to delete Scenario ' + smState.smVals.Scenario + '?',
                    spinner: false,
                    confirm: {
                        msg: 'Yes',
                        funcs: [scenarioDeleteConfirmed]
                    },
                    deny: {
                        msg: 'No',
                        funcs: []
                    }
                }
            });
        });
    }

    function dropdownAndMenuEvents(){
        // disable Assumptions dropdowns if Actual ("default") Scenario selected
        $J('#smEntities').on('click', '.select2-selection', function() {
            if (smState.smVals.Scenario === DEFAULT_SCENARIO_NAME) {
                modalMsg('erase');
                modalMsg('error', {
                    msgItem: {
                        title: 'Choose Another Scenario',
                        message: 'Projections are allowed in Scenarios other than ' + DEFAULT_SCENARIO_NAME + '. Please choose another Scenario to make projections.',
                        spinner: false,
                        confirm: {
                            msg: 'Ok',
                            funcs: []
                        },
                        deny: {}
                    }
                });
            }
        });

        // save currently selected sub-select value if sub-select is active
        $J('#smFilters').on('click', '.select2-selection__rendered', function() {
            var thisSelID = $J(this).closest('div').find('select').attr('id'),
                hasDepends = thisSelID + '-' + formatStringChars($J(this).text()),
                subSelectID;

            if (hasDepends in dependSelects) {
                subSelectID = dependSelects[hasDepends];
                if (!$J('#' + subSelectID + '-container').hasClass('hidden')) {
                    wasSelectedVal[thisSelID] = subSelectID;
                }
            }
        });

        // MAIN: handles all dropdown selections events
        $J('#sm').on('change', 'select', function(event, selectVal) {
            var thisSelect = $J(this),
                thisSelectVal = isDefinedAndTrue(selectVal) ? selectVal : thisSelect.val(),
                thisSelectID = thisSelect.attr('id'),
                thisDefaultOpt = thisSelect.find('option:first').text(),
                permitReprintActuals = false; // TODO: how can this be improved

            processingMsg();

            // ************************************
            // *** case: Scenario select change ***
            // ************************************

            if (thisSelectID === "curScenarioSel") {
                setScenarioStateAndUrl(thisSelectVal);

                // empty SM components
                $J('#smEntities').empty();

                // re-set Dimension dropdowns
                loadDimensionSelections(showDimensionSelections);

                // reload Actuals and Assumtions dropdowns
                loadActualsAndAssumptions();
                collapseActualsAndAssumptions();

                applySelect2(['assumptions']);
            }
            else {

                // ***************************************
                // *** case: Dimensions selects change ***
                // ***************************************

                if (thisSelect.closest('section').attr('id') === 'smFilters') {
                    var parentDivID,
                        setTo,
                        formattedVal,
                        hasChildSel;

                    // if current select has an option previously selected, clear children of previous option
                    if (thisSelectID in wasSelectedVal) {
                        clearChildSelect(wasSelectedVal[thisSelectID]);
                    }

                    // set dimRowOptSelected text to most current selection
                    parentDivID = thisSelect.closest('.varSelect').attr('id');
                    setTo = thisSelectVal === '' ? thisDefaultOpt : thisSelectVal;
                    if (setTo !== DEF_CHILD_OPT_NAME) {
                        $J('.dimRowLabel[dimid="' + parentDivID + '"]').text(setTo);
                    }

                    // check to see if this select has any dependencies, display child
                    formattedVal = isDefinedAndTrue(thisSelectVal) ? formatStringChars(thisSelectVal) : thisSelectVal;
                    hasChildSel = thisSelectID + formattedVal + '-container';
                    if ($J('#' + hasChildSel).length) {
                        $J('#' + hasChildSel).removeClass('hidden');
                    }

                    if (smState.permitAssembleCharts) {
                        repositionVarSelect(parentDivID);
                    }
                    permitReprintActuals = true; // TODO: how can this be improved
                }

                // ****************************************
                // *** case: Assumptions selects change ***
                // ****************************************

                else {
                    saveAssumptions();
                }

                // reset wasSelectedVal
                for (var key in wasSelectedVal) {
                    if (wasSelectedVal.hasOwnProperty(key)) {
                        delete wasSelectedVal[key];
                    }
                }
            }

            if (smState.permitAssembleCharts) { // TODO: how can this be improved
                if (permitReprintActuals) { // TODO: how can this be improved
                    reprintActuals();
                }
                setTimeout(function() {
                    processingMsg();
                }, 0);

                // pull vals from all SM selects and reload all charts
                //assembleCharts();
            }
            else {
                setTimeout(function() {
                    processingMsg();
                }, 100);
            }
        });

        // Dimension label click, display all related elements
        $J('#dimRowLabels').on('click', '.dimRowLabel', function() {
            var thisRowLabel = $J(this),
                divToShow,
                containerToShow;

            $J('.dimRowLabel').removeClass('dimRowLabelFocus'); // clear hover styling from all row labels
            thisRowLabel.addClass('dimRowLabelFocus'); // add hover styling to THIS row label
            expandedSM(true);
            $J('#smFilters').addClass('dimRowDropdownsFocus'); // add gray background, appears to apply to dropdowns column only
            $J('.varSelect').addClass('hidden'); // hide all dropdowns
            divToShow = thisRowLabel.attr('dimid'); // show dropdown for label being hovered over
            containerToShow = thisRowLabel.attr('ddid');
            divToShow = formatStringSpace(divToShow);
            $J('#' + divToShow).removeClass('hidden');
            $J('#' + containerToShow + '-container').removeClass('hidden');
            repositionVarSelect(divToShow);
        });

        // onMouseLeave, clear Dimension and related elements
        $J('#smFilters').mouseleave(function() {
            setTimeout(function() {
                if (!onSelect2) {
                    $J('.dimRowLabel').removeClass('dimRowLabelFocus'); // remove hover styling to row labels
                    $J('#smFilters').removeClass('dimRowDropdownsFocus'); // remove gray background that appears behind dropdowns column
                    $J('.varSelect').addClass('hidden'); // hide all dropdowns
                    expandedSM(false);
                }
            }, 100);
        });

        // prevent #smFilters.mouseleave from executing
        $J('body').on('mouseenter', '.select2-dropdown', function() {
            onSelect2 = true;
        });

        // undo onMouseEnter above
        $J('body').on('mouseleave : focusout', '.select2-dropdown', function() {
            onSelect2 = false;
        });

        // closes select2 dropdown without the need for a click outside of the element
        $J('#sm').on('mouseenter', '#smFilters', function() {
            $J('.dimensionDD').each(function() {
                $J(this).select2("close");
            });
        });
    }

    /** Ante Up **/

    function init(stateObj){
        var key,
            urlParams;

        //preInitProcessing();

        setSMStateObj(stateObj);

        //processingMsg(); // TODO: create processing queue
        expandedSM(false); // set SM width

        if (smState.eventTrigger.pageLoad){
            if (window.location.search === '') { // set Scenario name value in smState and URL
                setScenarioStateAndUrl(DEFAULT_SCENARIO_NAME);
            } else {
                urlParams = getQueryParams(window.location.search);
                if (SAVED_SCENARIO_KEY in urlParams) {
                    setScenarioStateAndUrl(urlParams[SAVED_SCENARIO_KEY]);
                } else {
                    setScenarioStateAndUrl(DEFAULT_SCENARIO_NAME);
                }
            }

        }

        for (key in smState.eventRequest.build){ // set up for build of SM components
            if (smState.eventRequest.build.hasOwnProperty(key)){
                switch (key){
                    case 'Scenario':
                        if (smState.eventRequest.build.Scenario){
                            $J('#curScenarioSel').empty();
                        }
                        break;
                    case 'Dimensions':
                        if (smState.eventRequest.build.Dimensions){
                            $J('#dimRowLabels').empty();
                            $J('#dimRowDropdowns').empty();
                        }
                        break;
                    case 'Actuals':
                        if (smState.eventRequest.build.Actuals){
                            $J('#smEntities .actualVal').each(function(){
                                $J(this).empty();
                                debugger;
                            });
                        }
                        break;
                    case 'Assumptions':
                        if (smState.eventRequest.build.Assumptions){
                            $J('#smEntities .assumptionVal').each(function(){
                                $J(this).empty();
                            });
                        }
                        break;
                    default:
                        consoleLog('init', ['Trying to build "' + key + '", a component that does not exist.'], null, 'error');
                }
            }
        }

        for (key in smState.eventRequest.load){ // load SM data
            if (smState.eventRequest.load.hasOwnProperty(key)){
                switch (key){
                    case 'Scenario':
                        if (smState.eventRequest.load.Scenario){
                            loadCurrScenarioData(buildCurrScenarioDD);
                        }
                        break;
                    case 'Dimensions':
                        if (smState.eventRequest.load.Dimensions){
                            loadDimensionsData(buildDimensionsDD);
                            loadDimensionSelections(showDimensionSelections);
                        }
                        break;
                    case 'Actuals':
                        if (smState.eventRequest.load.Actuals){
                            loadActuals(buildActuals);
                        }
                        break;
                    case 'Assumptions':
                        if (smState.eventRequest.load.Assumptions){
                            loadAssumptions(buildAssumptions);
                        }
                        break;
                    default:
                        consoleLog('init', ['Trying to load "' + key + '", this data does not exist.'], null, 'error');
                }
            }
        }

        assembleCharts();
        applySelect2(['scenario', 'dimensions', 'assumptions']); // add Select2 functionality to dropdowns
        sectionScenariosEvents(); // set SM event listeners
        //dropdownAndMenuEvents();
        adjustSMPanel(); // adjust height of SM panel

        //TODO: set somewhere else - > setSMStateObj(SM_STATE_DEFAULTS);
        //postInitProcessing();
        collapseActualsAndAssumptions();

        // TODO: end to processing queue
        // need condition so this doesn't accidentally overwrite other modal msgs, i.e. failure msgs
        // modalMsg('erase');
    }

    return {
        smInit: init,
        getSMVals: smState.smVals,
        getTM1CurrentYear: getTM1CurrentYear
    };
})();

scManager.smInit({
    eventTrigger: {
        pageLoad: true
    },
    eventRequest: {
        load: {
            Scenario: true,
            Dimensions: true,
            Actuals: true,
            Assumptions: true
        },
        build: {
            Scenario: true,
            Dimensions: true,
            Actuals: true,
            Assumptions: true
        }
    }
});