/**
 * Created by pablo on 2/15/2016.
 */

/* global $J, isDefinedAndTrue, isDefined, Spinner, es */

var scManager = (function(){

    /**
     TODO:
     if window.location.pathname = HCFS Asset or HCFS Impact
     var periodYearOnly = true;

     need to take into account upper and lower case cases

     then search for periodYearOnly in this script
     **/

    var allowConsoleLog = false,
        smVals = {}, // Current SM values
        defOptNameChild = "More specifically...", // Value for default option of Dimension child dropdowns
        defaultScenarioName = 'Actual', // Value for default option of Scenario dropdown
        protectedScenarios = ['Benchmark', defaultScenarioName], // Protected Scenarios
        permitAssembleCharts = true, // Permits/prevents assembleCharts from executing
        tm1CurrentYear = null, // Holds the current year from TM1
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
        dependSelects = {}, // holds list of dependent select lists: dependSelects{ selectID-optValue:subSelectID }
        wasSelectedVal = {}, // holds previously selected value - used to clear sub-selects in case they are active: wasSelectedVal{ selectID:subSelectID }
        onSelect2 = false, // prevents premature #smFilters.mouseleave events. select2 is positioned absolute-ly, so when we mouseover select2 dropdown Dimension label onMouseEnter event affects disappear
        dimensionsResults = {}, // holds Dimensions dropdown selections web method Results JSON string
        actualsArr = [], // holds Actuals values
        assumptionsArr = [], // holds Assumptions values
        assumptionsResults = {}, // holds Assumptions web method Results JSON string
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
        ddOnLoad = {
            period: {
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
            division: {
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
            businessLine: {
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
            geoRegion: {
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
            workforceCategory: {
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
            workerType: {
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
            jobGrade: {
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
            functionalGroup: {
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
            jobFunction: {
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
        },
        periodYearOnly = false,
        sascExists,
        savedScenarioKey = 'sasc',
        urlParams,
        key,
        obj,
        whichDropdowns = ['scenario', 'dimensions', 'assumptions'],
        smState = {
            smVals: {}
        };

    /************************************************
     Section: Dropdown and Menu events
     *************************************************/

    function dropdownAndMenuEvents(){
        // disable Assumptions dropdowns if Actual or Protected Scenario selected
        $J('#smEntities').on('click', '.select2-selection', function() {
            if ($J('#curScenarioSel').val() === defaultScenarioName) {
                var title = "Choose Another Scenario",
                    msg = "Projections are allowed in Scenarios other than \"" + defaultScenarioName + "\". Please choose another Scenario to make projections.",
                    btnID = "#overlayConfirmBtn",
                    btnLabel = "Try Again";

                overlayContent(title, msg);
                showBtn(btnID, btnLabel);
                $J(btnID).click(function() {
                    hideBtns(true);
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

        // MAIN: handles all the main functions when making a dropdown selection
        $J('#sm').on('change', 'select', function(event, selectVal) {
            showProcessing(true);

            var thisSelect = $J(this),
                thisSelectVal = isDefinedAndTrue(selectVal) ? selectVal : thisSelect.val(),
                thisSelectID = thisSelect.attr('id'),
                thisDefaultOpt = thisSelect.find('option:first').text(),
                permitReprintActuals = false;

            // ************************************
            // *** case: Scenario select change ***
            // ************************************

            if (thisSelectID === "curScenarioSel") {
                // toggle Update & Delete buttons for Current Scenario
                if (thisSelectVal !== "Load a scenario..." && protectedScenarios.indexOf(thisSelectVal) === -1) {
                    $J('#cur-scenario-tab-btns').css('display', 'inline-block');
                }
                else {
                    $J('#cur-scenario-tab-btns').hide();
                }
                rewriteLinks(thisSelectVal);
                rewriteURL(thisSelectVal);

                // reload Dimension dropdowns
                getDimensionSelections(thisSelectVal);

                // reload Actuals and Assumtions dropdowns
                $J('#smEntities').empty();
                printActualsAndAssumptions();
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
                    if (setTo !== defOptNameChild) {
                        $J('.dimRowLabel[dimid="' + parentDivID + '"]').text(setTo);
                    }

                    // check to see if this select has any dependencies, display child
                    formattedVal = isDefinedAndTrue(thisSelectVal) ? formatStringChars(thisSelectVal) : thisSelectVal;
                    hasChildSel = thisSelectID + formattedVal + '-container';
                    if ($J('#' + hasChildSel).length) {
                        $J('#' + hasChildSel).removeClass('hidden');
                    }

                    if (permitAssembleCharts) {
                        repositionVarSelect(parentDivID);
                    }
                    permitReprintActuals = true;
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

            if (permitAssembleCharts) {
                if (permitReprintActuals) {
                    reprintActuals();
                }
                // push showProcessing into the Queue
                setTimeout(function() {
                    showProcessing(false);
                }, 0);

                // pull vals from all SM selects and reload all charts
                assembleCharts();
            }
            else {
                // push showProcessing into the Queue
                setTimeout(function() {
                    showProcessing(false);
                }, 100);
            }
        });

        // Dimension label click, display all related elements
        $J('#dimRowLabels').on('click', '.dimRowLabel', function() {
            var thisRowLabel = $J(this),
                divToShow,
                containerToShow;

            // clear hover styling from all row labels
            $J('.dimRowLabel').removeClass('dimRowLabelFocus');
            // add hover styling to THIS row label
            thisRowLabel.addClass('dimRowLabelFocus');
            expandedSM(true);
            // add gray background, appears to apply to dropdowns column only
            $J('#smFilters').addClass('dimRowDropdownsFocus');
            // hide all dropdowns
            $J('.varSelect').addClass('hidden');
            // show dropdown for label being hoverred over
            divToShow = thisRowLabel.attr('dimid');
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
                    // remove hover styling to row labels
                    $J('.dimRowLabel').removeClass('dimRowLabelFocus');
                    // remove gray background that appears behind dropdowns column
                    $J('#smFilters').removeClass('dimRowDropdownsFocus');
                    // hide all dropdowns
                    $J('.varSelect').addClass('hidden');
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

    /************************************************
     Section: Scenarios
     *************************************************/

    function currScenarioDataPull(savedScenario) { // data pull
        // web method: TM1DimensionMembers?DimName=Scenario
        var params = { "DimName": "Scenario"},
            thisDropDown = 'Current Scenario',
            selectCurrScenario = $J('#curScenarioSel'),
            selectedValue,
            onSuccess,
            onFailure;

        onSuccess = function(resultObj) {
            var sortedResults = [],
                optionStr;

            selectCurrScenario.empty();

            resultObj.Results.Members.forEach(function(value) {
                sortedResults.push(value.Name);
            });
            sortedResults.sort();
            optionStr = '';
            sortedResults.forEach(function(value) {
                optionStr = '<option value="' + value + '"';
                if (defaultScenarioName === value || (isDefinedAndTrue(savedScenario) && savedScenario === value)) {
                    optionStr += 'selected = "selected"';
                    selectedValue = value;
                }
                optionStr += '>' + value + '</option>';
                selectCurrScenario.append(optionStr);
            });

            if (selectedValue){
                permitAssembleCharts = false;
                // trigger change so that it registers with select2
                selectCurrScenario.val(selectedValue).trigger('change', selectedValue);
                selectCurrScenario.next().find('.select2-selection__rendered').text(selectedValue);
                permitAssembleCharts = true;
            }
        };

        onFailure = function(error) {
            var title = "Please Try Again",
                msg = "The " + thisDropDown + " drop down failed to load. Please try again or report this to your system administrator.",
                btnID = "#overlayConfirmBtn",
                btnLabel = "Try Again";

            overlayContent(title, msg);
            showBtn(btnID, btnLabel);
            $J(btnID).click(function() {
                currScenarioDataPull();
                hideBtns(true);
            });
        };

        es.get("TM1DimensionMembers", params, onSuccess, onFailure, false);
    }

    function createNewScenario(newScenarioName) {
        // *** test if new name is unique ***
        // **********************************
        // web method: TM1DimensionMembers?DimName=Scenario
        var params = { "DimName": "Scenario"},
            testPassed = true,
            onSuccess,
            onFailure;

        onSuccess = function(resultObj) {
            resultObj.Results.Members.forEach(function(value) {
                if (value.Name === newScenarioName) {
                    $J('#overlayLoading').hide();
                    var title = "Choose Another Name",
                        msg = "The proposed Scenario name already exists. Please choose another name.",
                        btnID = "#overlayConfirmBtn",
                        btnLabel = "Continue";

                    overlayContent(title, msg);
                    showBtn(btnID, btnLabel);
                    $J(btnID).click(function() {
                        hideBtns(true);
                    });
                    testPassed = false;
                }
            });

            // *** create new Scenario ***
            // ***************************
            // web method: ScenarioElementInsert?p_element=NewScenarioName

            if (testPassed) {
                var copyTo = newScenarioName,
                    title = "Creating New Scenario",
                    msg = "A new Scenario is being created. This may take a moment.",
                    params,
                    onSuccess,
                    onFailure;

                overlayContent(title, msg);
                showLoading();
                params = { "p_element": copyTo };

                onSuccess = function() {
                    $J('#overlayLoading').hide();
                    var title = "<span style=\"color:green\">Success</span>",
                        msg = "Scenario \"" + copyTo + "\" was created.",
                        btnID = "#overlayConfirmBtn",
                        btnLabel = "Continue";

                    overlayContent(title, msg);
                    showBtn(btnID, btnLabel);
                    $J(btnID).click(function() {
                        hideBtns(true);
                    });
                    // in case of previous error & red font, reset
                    $J('#new-scenario-tab').hide();
                    $J('#cur-scenario-tab').show();
                    $J('#smFilters').show();
                    $J('#smEntities').show();
                    resetSM();
                };

                onFailure = function() {
                    $J('#overlayLoading').hide();
                    var title = "Failed",
                        msg = "Scenario \"" + copyTo + "\" was not created.",
                        btnID = "#overlayConfirmBtn",
                        btnLabel = "Try Again";

                    overlayContent(title, msg);
                    showBtn(btnID, btnLabel);
                    $J(btnID).click(function() {
                        createNewScenario(newScenarioName);
                        hideBtns(true);
                    });
                };

                es.get("ScenarioElementInsert", params, onSuccess, onFailure, true, "json", 120000, "There is still no response from the server. Do you want to abort the request?", 120000);
            }
        };

        onFailure = function(error) {
            var title = "Warning",
                msg = "The proposed name may not be unique. Can we do a more detailed check?",
                btnID = "#overlayConfirmBtn",
                btnLabel = "Yes";

            overlayContent(title, msg);
            showBtn(btnID, btnLabel);
            $J(btnID).click(function() {
                createNewScenario(newScenarioName);
                hideBtns(true);
            });
        };

        es.get("TM1DimensionMembers", params, onSuccess, onFailure, false);
    }

    function sectionScenariosEvents() {
        // *** Current Scenario ***
        // ************************
        // toggle tab
        $J('#create-toggle-btn').click(function() {
            $J('#smFilters').hide();
            $J('#smEntities').hide();
            $J('#cur-scenario-tab').hide();
            $J('#new-scenario-tab').show();
        });

        // *** Update Scenario ***
        // ***********************
        $J('#update-scenario-btn').click(function() {
            saveDimensionSelections();
        });

        // *** Delete Scenario ***
        // ***********************
        $J('#delete-scenario-btn').click(function() {
            // web method: TM1DimensionDeleteMember?DimName=Scenario&MemberID=Test
            var currScenario = $J('#curScenarioSel').val(),
                title = "Confirm Delete",
                msg = "Are you sure you want to delete Scenario \"" + currScenario + "\"?",
                btnID = "#overlayConfirmBtn",
                btnLabel = "Yes",
                btnID2 = "#overlayDenyBtn",
                btnLabel2 = "No";

            overlayContent(title, msg);
            showBtn(btnID, btnLabel);
            showBtn(btnID2, btnLabel2);
            $J(btnID).click(function() {
                // Delete action confirmed
                hideBtns();
                var title = "Deleting Scenario",
                    msg = "Scenario \"" + currScenario + "\" is being deleted. This may take a moment.",
                    params,
                    onSuccess,
                    onFailure;

                overlayContent(title, msg);
                showLoading();
                params = { "DimName": "Scenario", "MemberID": currScenario };

                onSuccess = function(e) {
                    $J('#overlayLoading').hide();
                    var title = "<span style=\"color:green\">Success</span>",
                        msg = "Scenario \"" + currScenario + "\" was deleted.",
                        btnID = "#overlayConfirmBtn",
                        btnLabel = "Ok";

                    $J(btnID).unbind('click');
                    overlayContent(title, msg);
                    showBtn(btnID, btnLabel);
                    $J(btnID).click(function() {
                        hideBtns(true);
                    });

                    resetSM(true);
                };

                onFailure = function(e) {
                    $J('#overlayLoading').hide();
                    var title = "Delete Failed",
                        msg = "Scenario \"" + currScenario + "\" failed to delete.",
                        btnID = "#overlayConfirmBtn",
                        btnLabel = "Try Again";

                    $J(btnID).unbind('click');
                    overlayContent(title, msg);
                    showBtn(btnID, btnLabel);
                    $J(btnID).click(function() {
                        hideBtns(true);
                    });
                };

                es.get("TM1DimensionDeleteMember", params, onSuccess, onFailure, true);
            });
            $J(btnID2).click(function() {
                // Delete action denied
                hideBtns(true);
            });
        });

        // *** Create Scenario ***
        // ***********************
        // toggle tab
        $J('#select-toggle-btn').click(function() {
            $J('#new-scenario-tab').hide();
            $J('#cur-scenario-tab').show();
            $J('#smFilters').show();
            $J('#smEntities').show();
        });

        var nameInput = $J('#create-scenario-name'),
            defVal = '',
            errorVal = 'Please enter a name';

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
    }

    /************************************************
     Section: Dimension dropdowns
     *************************************************/

    // *** Get/load all Dimensions dropdown options ***

    function getDropDownData(obj) {
        var params = {},
            onSuccess,
            onFailure;

        params[obj.webMParamKey1] = obj.webMParamVal1;
        if (isDefinedAndTrue(obj.webMParamKey2)) {
            params[obj.webMParamKey2] = obj.webMParamVal2;
        }

        onSuccess = function(resultObj) {
            createDimDDRow(obj.selectID, obj.webMParamVal1, obj.defOptName);
            buildDropDown(obj, resultObj);
        };

        onFailure = function() {
            var title = "Drop Down List Failed",
                msg = "The " + obj.selectID + " drop down failed to load.",
                btnID = "#overlayConfirmBtn",
                btnLabel = "Try Again";

            overlayContent(title, msg);
            showBtn(btnID, btnLabel);
            $J(btnID).click(function() {
                getDropDownData(obj);
                hideBtns(true);
            });
        };

        es.get(obj.methodName, params, onSuccess, onFailure, false);
    }

    function createDimDDRow(ddID, dimID, rowDefault) {
        var newDimID = formatStringSpace(dimID),
            printRowLabel = '<div class="dimRowLabel" dimid="' + newDimID + '" ddid="' + ddID + '">' + rowDefault + '</div>';
        $J('#dimRowLabels').append(printRowLabel);
    }

    function buildDropDown(obj, resultObj) {
        var dimNameAsKey = obj.webMParamVal1, // this val is same as the dimension used for filtering data, aka "dimid", as in 'Period' = 2009
            resultStruct;

        $J('#dimRowDropdowns').append('<div class="clear-fix varSelect" id="' + formatStringSpace(dimNameAsKey) + '"></div>');
        resultStruct = resultObj.Results.Members;
        resultStruct.forEach(function(value) {
            // if this == period, then parse differently
            if (value.ID === ddOnLoad.period.resultsMembersID) {
                iterateDimChildren(value.Children, obj, null, true);
            }
            else if (value.ID === obj.resultsMembersID) {
                iterateDimChildren(value.Children, obj, null, false);
            }
        });
    }

    function iterateDimChildren(childObj, obj, aParID, isPeriodChildAttr) {
        var dimDDText = { // format Dimension dropdown labels/text
                // i.e. 'Management & Senior Leadership': 'Mgmt and Senior Leadership'
            },
            sortOptions = [],
            parID = isDefinedAndTrue(aParID) ? aParID : '',
            dimNameAsKey = obj.webMParamVal1,
            selectCurrScenario,
            defOptName,
            optionStr,
            optionText;

        dimNameAsKey = formatStringSpace(dimNameAsKey);
        $J('#' + dimNameAsKey).append('<div class="clear-fix hidden" id="' + obj.selectID + '-container"><select name="' + obj.selectID + '" size="1" class="dimensionDD" id="' + obj.selectID + '" dimid="' + dimNameAsKey + '" parid="' + parID + '"></select></div>');

        selectCurrScenario = $J('#' + obj.selectID);
        defOptName = isDefinedAndTrue(obj.defOptName) ? obj.defOptName : defOptNameChild;
        optionStr = '<option value="" selected="selected">' + defOptName + '</option>';

        selectCurrScenario.empty().append(optionStr);

        childObj.forEach(function(value) {
            var valueToAdd = isPeriodChildAttr ? value.Attributes[0].Value : value.Name,
                hasChildren = value.Children,
                yearOnly = periodYearOnly && obj.resultsMembersID === ddOnLoad.period.resultsMembersID,
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
        //sortOptions.sort();
        for (var i = 0, arrLen = sortOptions.length; i < arrLen; i++) {
            optionText = sortOptions[i];
            // uncomment to format Dimension dropdown option TEXT
            // if (optionText in dimDDText) {
            //     optionText = dimDDText[optionText];
            // }
            optionStr = '<option value="' + sortOptions[i] + '">' + optionText + '</option>';
            selectCurrScenario.append(optionStr);
        }
    }

    // *** Get saved Dimensions dropdown selections/config ***

    function getDimensionSelections(getScenario) {
        var params = {},
            // called when a saved Scenario is loaded / web method: ScenarioManager?Scenario=Actual
            webMethod = "ScenarioManager",
            onSuccess,
            onFailure;

        params.Scenario = isDefinedAndTrue(getScenario) ? getScenario : defaultScenarioName;

        onSuccess = function(resultObj) {
            var dimensionsRows,
                dimensionArr,
                rowKey = 0;

            dimensionsResults = resultObj.Results; // save a copy of Results JSON for post via saveDimensionSelections()

            dimensionsRows = resultObj.Results.RowSet.Rows;
            dimensionArr = [ // get saved Dimension selects options
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

            // if not equal, convert saved value, i.e. 'All Years', to default option text, i.e. 'Current Year'
            dimensionArr.forEach(function(value, index) {
                for (var key in ddOnLoad) {
                    if (ddOnLoad.hasOwnProperty(key)) {
                        if ((value === ddOnLoad[key].resultsMembersID) && (value !== ddOnLoad[key].defOptName)) {
                            dimensionArr[index] = ddOnLoad[key].defOptName;
                        }
                    }
                }
            });
            setDimensionSelections(dimensionArr);
        };

        onFailure = function() {
            var title = "Failed to Get Data",
                msg = "Some of the data failed to load.",
                btnID = "#overlayConfirmBtn",
                btnLabel = "Try Again";

            overlayContent(title, msg);
            showBtn(btnID, btnLabel);
            $J(btnID).click(function() {
                getDimensionSelections(isDefinedAndTrue(getScenario) ? getScenario : defaultScenarioName);
                hideBtns(true);
            });
        };

        es.get(webMethod, params, onSuccess, onFailure, false);
    }

    function setDimensionSelections(savedDims) {
        var dimIDs = [
                [
                    ddOnLoad.period.selectID,
                    ddOnLoad.period.webMParamVal1
                ],
                [
                    ddOnLoad.division.selectID,
                    ddOnLoad.division.webMParamVal1
                ],
                [
                    ddOnLoad.businessLine.selectID,
                    ddOnLoad.businessLine.webMParamVal1
                ],
                [
                    ddOnLoad.geoRegion.selectID,
                    ddOnLoad.geoRegion.webMParamVal1
                ],
                [
                    ddOnLoad.workforceCategory.selectID,
                    ddOnLoad.workforceCategory.webMParamVal1
                ],
                [
                    ddOnLoad.workerType.selectID,
                    ddOnLoad.workerType.webMParamVal1
                ],
                [
                    ddOnLoad.jobGrade.selectID,
                    ddOnLoad.jobGrade.webMParamVal1
                ],
                [
                    ddOnLoad.functionalGroup.selectID,
                    ddOnLoad.functionalGroup.webMParamVal1
                ],
                [
                    ddOnLoad.jobFunction.selectID,
                    ddOnLoad.jobFunction.webMParamVal1
                ]
            ];

        dimIDs.forEach(function(value, index) {
            var savedSelectVal,
                thisOption;

            // reset dropdowns first
            clearChildSelect(value[0]);

            // get saved Option value
            savedSelectVal = savedDims[index];
            // find option text matching saved Dim value
            $J('#' + formatStringSpace(value[1])).find('option').each(function() {
                thisOption = $J(this);
                if (thisOption.text() === savedSelectVal) {
                    showSelection(thisOption);
                }
            });
        });
    }

    function showSelection(selectedOption) {
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
                                showSelection(thisParOption);
                            }
                        });
                    }
                }
            }
        }
        curSelectOpt = thisClosestSelect.find('option:selected');
        if (curSelectOpt.text() !== selectedOption.text()) {
            // clear current "selected"
            curSelectOpt.removeAttr('selected');
            // set new "selected" option
            selectedOption.attr('selected', 'selected');

            permitAssembleCharts = false;

            // trigger change so that it registers with select2
            thisClosestSelect.val(selectedOption.text()).trigger('change', selectedOption.text());
            thisClosestSelect.next().find('.select2-selection__rendered').text(selectedOption.text());
        }
        // show container div
        containerDivID = thisClosestSelect.attr('id');
        $J('#' + containerDivID + '-container').removeClass('hidden');

        permitAssembleCharts = true;
    }

    // *** Save Dimensions dropdown selections/config ***

    function saveDimensionSelections() {
        // web method: ScenarioManager?Scenario=Actual
        var dimRows = dimensionsResults.RowSet.Rows[0],
            currScenario = $J('#curScenarioSel option:selected').attr('value'),
            dimensionVals = getSMVals(),
            key,
            view,
            onSuccess,
            onFailure;

        for (key in dimRows) {
            if (dimRows.hasOwnProperty(key)) {
                switch (key) {
                    case 'Scenario':
                        dimRows.Scenario = isDefinedAndTrue(dimensionVals.Scenario) ? dimensionVals.Scenario : currScenario;
                        break;
                    case 'SelectedYear':
                        dimRows.SelectedYear = isDefinedAndTrue(dimensionVals.Period) ? dimensionVals.Period : ddOnLoad.period.resultsMembersID;
                        break;
                    case 'SelectedLegalEntity':
                        dimRows.SelectedLegalEntity = isDefinedAndTrue(dimensionVals.Division) ? dimensionVals.Division : ddOnLoad.division.resultsMembersID;
                        break;
                    case 'SelectedBusinessUnit':
                        dimRows.SelectedBusinessUnit = isDefinedAndTrue(dimensionVals.BusinessLine) ? dimensionVals.BusinessLine : ddOnLoad.businessLine.resultsMembersID;
                        break;
                    case 'SelectedRegion':
                        dimRows.SelectedRegion = isDefinedAndTrue(dimensionVals.Region) ? dimensionVals.Region : ddOnLoad.geoRegion.resultsMembersID;
                        break;
                    case 'SelectedWorkforceCategory':
                        dimRows.SelectedWorkforceCategory = isDefinedAndTrue(dimensionVals.WorkforceCategory) ? dimensionVals.WorkforceCategory : ddOnLoad.workforceCategory.resultsMembersID;
                        break;
                    case 'SelectedJobGrade':
                        dimRows.SelectedJobGrade = isDefinedAndTrue(dimensionVals.FLSA) ? dimensionVals.FLSA : ddOnLoad.jobGrade.resultsMembersID;
                        break;
                    case 'SelectedFunctionalGroup':
                        dimRows.SelectedFunctionalGroup = isDefinedAndTrue(dimensionVals.UDC1) ? dimensionVals.UDC1 : ddOnLoad.functionalGroup.resultsMembersID;
                        break;
                    case 'SelectedJobFunction':
                        dimRows.SelectedJobFunction = isDefinedAndTrue(dimensionVals.JobFunction) ? dimensionVals.JobFunction : ddOnLoad.jobFunction.resultsMembersID;
                        break;
                    default:
                        var msgArr = ['Error on switch! No cases met for - ' + key];
                        consoleLog('887', msgArr);
                }
            }
        }
        dimensionsResults.RowSet.Rows[0] = dimRows;
        view = dimensionsResults;

        onSuccess = function() {
            $J('#overlayLoading').hide();
            var title = "<span style=\"color:green\">Success</span>",
                msg = "Scenario \"" + currScenario + "\" was updated.",
                btnID = "#overlayConfirmBtn",
                btnLabel = "Ok";

            $J(btnID).unbind('click');
            overlayContent(title, msg);
            showBtn(btnID, btnLabel);
            $J(btnID).click(function() {
                hideBtns(true);
            });
        };

        onFailure = function() {
            $J('#overlayLoading').hide();
            var title = "Save Failed",
                msg = "Scenario \"" + currScenario + "\" failed to save.",
                btnID = "#overlayConfirmBtn",
                btnLabel = "Try Again";

            $J(btnID).unbind('click');
            overlayContent(title, msg);
            showBtn(btnID, btnLabel);
            $J(btnID).click(function() {
                saveDimensionSelections();
                hideBtns(true);
                showLoading();
            });
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

    /************************************************
     Section: Actuals and Assumptions
     *************************************************/

    function printActualsAndAssumptions() {
        var thisScenario = $J('#curScenarioSel').val(),
            displaySectionNames = { // formatting of Section names
                'Workforce': { displayName: 'Workforce Assumptions' },
                'Business&Financial': { displayName: 'Business & Financial' },
                'Learning': { displayName: 'Learning Dashboard' },
                'Performance&Engagement': { displayName: 'Performance & Engagement' }
            },
            actLen,
            assLen,
            i,
            newSectionTitle,
            arrSectionTitle,
            arrActTitle,
            arrActVal,
            arrAssTitle,
            arrAssVal;

        getActuals();
        getAssumptions(thisScenario);

        // something is missing if array lengths are not equal
        if (actualsArr.length !== assumptionsArr.length) {
            actLen = 'Number of Actuals: ' + actualsArr.length;
            assLen = 'Number of Assumptions: ' + assumptionsArr.length;
            consoleLog('1063', ['Error importing Actuals and Assumptions, something is missing!', actLen, assLen]);
        }
        else {
            i = 0;
            newSectionTitle = '';
            while (i < actualsArr.length) {
                arrSectionTitle = actualsArr[i][1];
                // if new Section title found, print
                if (arrSectionTitle !== newSectionTitle) {
                    newSectionTitle = arrSectionTitle;
                    if (arrSectionTitle in displaySectionNames) {
                        arrSectionTitle = displaySectionNames[arrSectionTitle].displayName;
                    }
                    $J('#smEntities').append('<div class="sectContainer"><p class="sectTitle">+ ' + arrSectionTitle + '</p><table border="0"><thead><tr><th class="varGroupTH">- ' + arrSectionTitle + '</th><th class="varGroupVal">Actual</th><th class="varGroupVal">% Change</th></tr></thead><tbody></tbody></table></div>')
                }
                // add rows to Section
                arrActTitle = actualsArr[i][0];
                arrActVal = actualsArr[i][2];
                arrAssTitle = assumptionsArr[i][0];
                arrAssVal = assumptionsArr[i][1];
                // test to see if Actuals and Assumptions source match
                if (arrActTitle !== arrAssTitle) {
                    $J('#smEntities').html('Error! Actuals and Assumptions rows do not match. On the same row we have Actual: ' + arrActTitle + ' & Assumption: ' + arrAssTitle);
                    break;
                }
                $J('#smEntities div:last-child table tbody').append(printRow(arrActTitle, arrActVal, arrAssVal));
                i++;
            }
        }
    }

    function getActuals() {
        // web method: ScenarioManagerActuals
        // Actuals web method accepts all Dimensions
        var webMethod = "ScenarioManagerActuals",
            scenarioLess = true,
            params = getSMVals(scenarioLess),
            tempArr = [],
            onSuccess,
            onFailure;

        onSuccess = function(resultObj) {
            var actuals = resultObj.Results.RowSet.Rows,
                key,
                actSect,
                actTitle,
                actVal;

            for (key in actuals) {
                if (actuals.hasOwnProperty(key)) {
                    actSect = actuals[key].ScenarioManagerActualsSection;
                    actTitle = actuals[key].ScenarioManagerActuals;
                    actTitle = actTitle.replace(' Actual', '');
                    actVal = actuals[key].AllUDC2;
                    tempArr.push([actTitle, actSect, actVal]);
                }
            }
            actualsArr = tempArr.slice();
        };

        onFailure = function() {
            var title = "Failed to Get Data",
                msg = "The actual/current data failed to load.",
                btnID = "#overlayConfirmBtn",
                btnLabel = "Try Again";

            overlayContent(title, msg);
            showBtn(btnID, btnLabel);
            $J(btnID).click(function() {
                getActuals();
                hideBtns(true);
            });
        };

        es.get(webMethod, params, onSuccess, onFailure, false);
    }

    function reprintActuals() {
        getActuals();
        $J('.actualVal').each(function(index) {
            var formattedVal = formatActualVal(actualsArr[index][0], actualsArr[index][2]);
            $J(this).html(formattedVal[1]);
        });
    }

    function getAssumptions(getScenario) {
        // web method: ScenarioAssumptionsChange
        // Assumptions takes only 1 Dimension + Scenario name
        var webMethod = "ScenarioAssumptionsChange",
            params = {},
            tempArr = [],
            onSuccess,
            onFailure;

        params.Scenario = isDefinedAndTrue(getScenario) ? getScenario : defaultScenarioName;

        onSuccess = function(resultObj) {
            var assumptions = resultObj.Results.RowSet.Rows,
                key,
                assTitle,
                assVal;

            assumptionsResults = resultObj.Results;

            for (key in assumptions) {
                if (assumptions.hasOwnProperty(key)) {
                    assTitle = assumptions[key].ScenarioAssumption;
                    assTitle = assTitle.replace(' Change Percent', '');
                    assVal = assumptions[key].AnalysisYear;
                    tempArr.push([assTitle, assVal]);
                }
            }
            assumptionsArr = tempArr.slice();
        };

        onFailure = function() {
            var title = "Failed to Get Data",
                msg = "The projection/assumption data failed to load.",
                btnID = "#overlayConfirmBtn",
                btnLabel = "Try Again";

            overlayContent(title, msg);
            showBtn(btnID, btnLabel);
            $J(btnID).click(function() {
                getAssumptions();
                hideBtns(true);
            });
        };

        es.get(webMethod, params, onSuccess, onFailure, false);
    }

    function printRow(actTitle, actVal, assVal) {
        var formattedResult = formatActualVal(actTitle, actVal);

        return '<tr><td class="varLabelTD">' + formattedResult[0] + '</td><td class="actualVal">' + formattedResult[1] + '</td><td class="assumptionVal">' + printAssumptionDD(formattedResult[0], assVal) + '</td></tr>';
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
                    percentify: 1
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
            // [title, value]
            formattedResults = [],
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

    function printAssumptionDD(actTitle, assVal) {
        var ddRange = [], // range of numbers for Assumptions ("% Change") dropdown options
            rangeStart = -200,
            rangeEnd = 200,
            percentified = (parseFloat(assVal) * 100).toFixed(0),
            returnStr = '<select name="' + actTitle + '" class="varPercent">';

        do {
            ddRange.push(rangeStart);
            rangeStart++;
        } while (rangeStart <= rangeEnd);

        ddRange.forEach(function(value) {
            returnStr += '<option value="' + value + '"';
            if (value.toString() === percentified) {
                returnStr += ' selected';
            }
            returnStr += '>' + value + '%</option>';
        });
        returnStr += '</select>';
        return returnStr;
    }

    function saveAssumptions() {
        // post to web method
        var saveToCompany = 'unassigned',
            saveToScenario = $J('#curScenarioSel option:selected').attr('value'),
            title,
            msg,
            btnID,
            btnLabel,
            view,
            resultsRows,
            assumptionsDDVals,
            count,
            key;

        // additional check to make sure we save to acceptable Scenario, i.e. not Actual/default
        // first check done onClick
        if (saveToScenario === '' || saveToScenario === defaultScenarioName) {
            title = "Save Failed";
            msg = (saveToScenario === '') ? "You must first choose a Scenario." : "You can not save to the default Scenario that is currently selected. Please choose another Scenario.";
            btnID = "#overlayConfirmBtn";
            btnLabel = "Try Again";
            overlayContent(title, msg);
            showBtn(btnID, btnLabel);
            $J(btnID).click(function() {
                hideBtns(true);
            });
            return;
        }

        // set to var set in getAssumptions()
        // pulled from web method: ScenarioAssumptionsChange
        view = assumptionsResults;
        view.TitleDimensions.Scenario.ID = saveToScenario;
        view.TitleDimensions.Scenario.Name = saveToScenario;
        view.TitleDimensions.Company.ID = saveToCompany;
        view.TitleDimensions.Company.Name = saveToCompany;
        resultsRows = view.RowSet.Rows;

        // get Assumptions vals from SM
        assumptionsDDVals = [];
        $J('.varPercent').each(function() {
            assumptionsDDVals.push($J(this).val());
        });

        // set Assumptions vals in object before post
        count = 0;
        for (key in resultsRows) {
            if (resultsRows.hasOwnProperty(key)) {
                resultsRows[key].AnalysisYear = assumptionsDDVals[count] / 100;
                count++;
            }
        }

        view.RowSet.Rows = resultsRows;

        var onSuccess = function(e) {
        };

        var onFailure = function(e) {
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

    /************************************************
     Section: Helpers
     *************************************************/

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

    function overlayContent(title, msg) {
        $J('#overlay').show();
        $J('#overlay .titleD').html(title);
        $J('#overlay .overlayMsg').html(msg);
    }

    function showBtn(btnID, btnLabel) {
        $J(btnID).show().html(btnLabel);
    }

    function hideBtns(hideOverlayToo) {
        if (isDefined(hideOverlayToo)) {
            $J('#overlay').hide();
        }
        $J("#overlay .overlayBtn").hide();
    }

    function showLoading() {
        var thisElem = $J('#overlayLoading'),
            target,
            spinner;

        thisElem.empty();
        target = document.getElementById('overlayLoading');
        spinner = new Spinner(spinnerOpts).spin(target);
        thisElem.show();
    }

    function showProcessing(flag) {
        var title,
            msg;

        if (flag) {
            title = '<span style="color:green">SOLVE&trade; is Processing...</span>';
            msg = "";
            overlayContent(title, msg);
            showLoading();
        }
        else {
            $J('#overlayLoading').hide();
            $J('#overlay').hide();
        }
    }

    function clearChildSelect(idToClear) {
        var key,
            obj,
            thisSel;

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

        permitAssembleCharts = true;
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

    function resetSM(afterDelete) {
        // reset Dimensions, Actuals and Assumptions
        $J('#curScenarioSel').empty();
        $J('#dimRowLabels').empty();
        $J('#dimRowDropdowns').empty();
        $J('#smEntities').empty();

        // re-initialize the SM
        if (isDefinedAndTrue(afterDelete)) {
            rewriteLinks(null, true);
            rewriteURL(null, true);
            init(true);
        }
        else {
            init();
        }
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

    function formatStringSpace(thisStr) {
        // removes whitespace
        return thisStr.replace(/\s+/g, '');
    }

    function formatStringChars(thisStr) {
        // removes non-alphanumeric
        return thisStr.replace(/\W/g, '');
    }

    function getSMVals(scenarioLess) {
        var postData = {}; // get values from SM dropdowns

        // iterate through drop downs and pull name/value pairs
        $J('#smFilters select').each(function() {
            var thisSel = $J(this),
                thisSeldimid = thisSel.attr('dimid'),
                // add default option text to Running Tab
                rtID = 'rt' + thisSeldimid,
                thisText = thisSel.find(':selected').text(),
                thisElem;

            if (thisText !== defOptNameChild) {
                $J('#' + rtID).html(thisText);
            }

            if (isDefinedAndTrue(thisSel.find(':selected').attr('value'))) {
                // these non-blank values will be used as params for TM1 web methods
                thisElem = $J(this);
                postData[thisSeldimid] = thisElem.val();

                // add to Running Tab
                rtID = 'rt' + thisSeldimid;
                $J('#' + rtID).html(thisElem.val());
            }
        });

        // get current Scenario
        if (!scenarioLess) {
            postData.Scenario = $J('#curScenarioSel').val();
        }

        smVals = postData;
        return postData;
    }

    function getTM1CurrentYear() {
        // web method: TM1SubsetMembers?DimName=Period&SubsetName=Current
        var params = {
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

        es.get("TM1SubsetMembers", params, onSuccess, onFailure, false);
    }

    function expandedSM(doIt) {
        var adj = 0,
            adjForIE = detectIE() ? 30 : 0,
            width;

        if (doIt) {
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

    function rewriteLinks(thisSelectVal, cleanMeUp) {
        var linksToRewrite = [
                '.powerToolsLI',
                '#navigation-menu'
            ];

        linksToRewrite.forEach(function(elem, index, array) {
            $J(elem).find('a').each(function() {
                var oldHref = $J(this).attr("href"),
                    newHref = '',
                    savedScenarioKey = 'sasc',
                    urlAndParams,
                    urlParams,
                    qString,
                    separator,
                    key;

                if (!isDefinedAndTrue(cleanMeUp)) {
                    if (oldHref.indexOf('?') > -1) {
                        // split loc and params
                        urlAndParams = oldHref.split('?');
                        // check for existing 'sasc' key, holds 'saved scenario' value
                        urlParams = getQueryParams(urlAndParams[1]);
                        urlParams[savedScenarioKey] = thisSelectVal;
                        qString = '';
                        separator = '?';
                        for (key in urlParams) {
                            if (urlParams.hasOwnProperty(key)) {
                                qString += separator + encodeURIComponent(key) + '=' + encodeURIComponent(urlParams[key]);
                                separator = '&';
                            }
                        }
                        newHref = urlAndParams[0] + qString;
                    }
                    else {
                        newHref = oldHref + '?' + savedScenarioKey + '=' + encodeURIComponent(thisSelectVal);
                    }
                }

                else {
                    if (oldHref.indexOf('?') > -1) {
                        // split loc and params
                        urlAndParams = oldHref.split('?');
                        // check for existing 'sasc' key, holds 'saved scenario' value
                        urlParams = getQueryParams(urlAndParams[1]);
                        if (savedScenarioKey in urlParams) {
                            delete urlParams[savedScenarioKey];
                        }
                        qString = '';
                        separator = '?';
                        for (key in urlParams) {
                            if (urlParams.hasOwnProperty(key)) {
                                qString += separator + encodeURIComponent(key) + '=' + encodeURIComponent(urlParams[key]);
                                separator = '&';
                            }
                        }
                        newHref = urlAndParams[0] + qString;
                    }
                    else {
                        newHref = oldHref;
                    }
                }

                $J(this).attr("href", newHref);
            });
        });
    }

    function rewriteURL(selectVal, removeSASC) {
        var savedScenarioKey = 'sasc',
            wLoc = window.location.pathname,
            qString = window.location.search,
            newQString = '',
            urlParams,
            separator,
            key;

        if (!isDefinedAndTrue(removeSASC)) {
            if (qString === '') {
                newQString = '?' + savedScenarioKey + '=' + selectVal;
            }
            else {
                urlParams = getQueryParams(qString);
                urlParams[savedScenarioKey] = selectVal;
                separator = '?';
                for (key in urlParams) {
                    if (urlParams.hasOwnProperty(key)) {
                        newQString += separator + encodeURIComponent(key) + '=' + encodeURIComponent(urlParams[key]);
                        separator = '&';
                    }
                }
            }
        }
        else if (qString !== '') {
            urlParams = getQueryParams(qString);
            if (savedScenarioKey in urlParams) {
                delete urlParams[savedScenarioKey];
            }
            newQString = '';
            separator = '?';
            for (key in urlParams) {
                if (urlParams.hasOwnProperty(key)) {
                    newQString += separator + encodeURIComponent(key) + '=' + encodeURIComponent(urlParams[key]);
                    separator = '&';
                }
            }
        }

        window.history.pushState('', 'Modified URL', wLoc + newQString);
    }

    function repositionVarSelect(divID) {
        var divJ = $J('#dimRowDropdowns').children('#' + divID),
            curTop,
            drl,
            baseTop,
            newTop;

        divJ.css({ 'position': 'relative', 'top': '0px', 'left': '0px' });

        curTop = $J('.dimRowLabelFocus').position().top;
        drl = $J('#dimRowLabels');
        baseTop = drl.position().top;
        newTop = (curTop - baseTop) + divJ.height() > drl.height() ?
            drl.height() - divJ.height() - 1 :
            curTop - baseTop;

        divJ.css({ 'position': 'relative', 'top': newTop + 'px', 'left': '0px' });
    }

    function consoleLog(lineNum, msgArr, obj, type) {
        var consoleType;

        if (allowConsoleLog) {
            consoleType = type || 'log';
            switch (consoleType) {
                case 'warn':
                    console.warn('*** ' + lineNum + ' ***');
                    break;
                case 'error':
                    console.error('*** ' + lineNum + ' ***');
                    break;
                case 'info':
                    console.info('*** ' + lineNum + ' ***');
                    break;
                default:
                    console.log('*** ' + lineNum + ' ***');
            }

            if (isDefined(msgArr)) {
                msgArr.forEach(function(value) {
                    console.log(value);
                });
            }
            if (isDefined(obj)) {
                console.log(obj);
            }
            console.log('*** ' + lineNum + ' ***');
        }
    }

    function init(disregardParam){
        // set SM width
        expandedSM(false);

        // check for Saved Scenario URL param
        sascExists = '';
        if (window.location.search !== '' && !isDefinedAndTrue(disregardParam)) {
            urlParams = getQueryParams(window.location.search);
            if (savedScenarioKey in urlParams) {
                sascExists = urlParams[savedScenarioKey];
                rewriteLinks(sascExists);
            }
        }

        // load Scenarios
        if (sascExists === '') {
            $J('#cur-scenario-tab-btns').hide();
        }
        currScenarioDataPull(sascExists);

        // load Dimension dropdowns
        for (key in ddOnLoad) {
            if (ddOnLoad.hasOwnProperty(key)) {
                obj = ddOnLoad[key];
                getDropDownData(obj);
            }
        }

        // set Dimension selections if Saved Scenario URL param exists
        if (sascExists !== '') {
            getDimensionSelections(urlParams[savedScenarioKey]);
        }

        // load Actuals and Assumptions
        printActualsAndAssumptions();

        // initial hide of Actuals and Assumptions data
        collapseActualsAndAssumptions();

        // add Select2 functionality to dropdowns
        applySelect2(whichDropdowns);
    }

    return {
        smInit: init,
        smEventListeners: function(){
            adjustSMPanel();
            dropdownAndMenuEvents();
            sectionScenariosEvents();
        },
        getSMVals: getSMVals,
        getTM1CurrentYear: getTM1CurrentYear
    };
})();

scManager.smEventListeners();
scManager.smInit();