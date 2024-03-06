/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { createSelector } from '@reduxjs/toolkit';
import { createStructuredSelector } from 'reselect';
import { selectGroupDataById } from '../../redux/api/groupsApi';
import { selectMeterDataById } from '../../redux/api/metersApi';
import { selectUnitById } from '../../redux/api/unitsApi';
import {
	selectAreaUnit, selectGraphAreaNormalization,
	selectLineGraphRate,
	selectSelectedGroups,
	selectSelectedMeters,
	selectSelectedUnit
} from '../../redux/slices/graphSlice';
import { RootState } from '../../store';
import { LineReadings } from '../../types/readings';
import { MeterOrGroup } from '../../types/redux/graph';
import { UnitRepresentType } from '../../types/redux/units';
import { barUnitLabel, lineUnitLabel } from '../../utils/graphics';
import { createAppSelector } from './selectors';
import { selectCompatibleSelectedGroups, selectCompatibleSelectedMeters } from './uiSelectors';


export const selectSelectedUnitData = (state: RootState) => selectUnitById(state, selectSelectedUnit(state));
export const selectIsRaw = (state: RootState) => selectSelectedUnitData(state)?.unitRepresent === UnitRepresentType.raw;

// custom typed selector to handle first arg of select from result. for data of type lineReadings.
export const selectFromLineReadingsResult = createSelector.withTypes<LineReadings>();

// Determines the unit label and scaling rate based on current graph settings.
export const selectLineUnitLabelRateScaling = createAppSelector(
	[selectAreaUnit, selectLineGraphRate, selectGraphAreaNormalization, selectSelectedUnitData],
	(areaUnit, lineGraphRate, areaNormalization, selectedUnitData) => {
		let unitLabel = '';
		let needsRateScaling = false;
		// // If graphingUnit is -99 then none selected and nothing to graph so label is empty.
		// // This will probably happen when the page is first loaded.
		if (selectedUnitData && selectedUnitData.id !== -99) {
			// Determine the y-axis label and if the rate needs to be scaled.
			const returned = lineUnitLabel(selectedUnitData, lineGraphRate, areaNormalization, areaUnit);
			unitLabel = returned.unitLabel;
			needsRateScaling = returned.needsRateScaling;
		}
		const rateScaling = needsRateScaling ? lineGraphRate.rate : 1;

		return { unitLabel, needsRateScaling, rateScaling };
	}
);
export const selectLineRateScaling = (state: RootState) => selectLineUnitLabelRateScaling(state).rateScaling;
export const selectLineNeedsRateScaling = (state: RootState) => selectLineUnitLabelRateScaling(state).needsRateScaling;
export const selectLineUnitLabel = (state: RootState) => selectLineUnitLabelRateScaling(state).unitLabel;

// Determines the unit label and scaling rate based on current graph settings.
export const selectBarUnitLabel = (state: RootState) => {
	const areaUnit = selectAreaUnit(state);
	const areaNormalization = selectGraphAreaNormalization(state);
	const selectedUnit = selectSelectedUnit(state);
	const unit = selectSelectedUnitData(state);
	let unitLabel: string = '';
	// If graphingUnit is -99 then none selected and nothing to graph so label is empty.
	// This will probably happen when the page is first loaded.
	if (unit && selectedUnit !== -99) {
		// Determine the y-axis label.
		unitLabel = barUnitLabel(unit, areaNormalization, areaUnit);
	}
	return unitLabel;
};

// Line and Groups use these values to derive plotly data, so make selector for them to 'extend'
export const selectCommonPlotlyDependencies = createStructuredSelector(
	{
		selectedUnit: selectSelectedUnit,
		lineGraphRate: selectLineGraphRate,
		areaUnit: selectAreaUnit,
		areaNormalization: selectGraphAreaNormalization,
		meterDataById: selectMeterDataById,
		groupDataById: selectGroupDataById,
		rateScaling: selectLineRateScaling,
		needsRateScaling: selectLineNeedsRateScaling,
		lineUnitLabel: selectLineUnitLabel,
		barUnitLabel: selectBarUnitLabel,
		isRaw: selectIsRaw
	},
	createAppSelector
);

// Common Meter Plotly Meter dependencies
// a change in selected meters, should not trigger group re-calculations and visa versa so Separate meters and group for proper memoization.
export const selectPlotlyMeterDeps = createAppSelector(
	[selectCommonPlotlyDependencies, selectSelectedMeters, selectCompatibleSelectedMeters],
	(deps, selectedEntities, compatibleEntities) => ({ ...deps, selectedEntities, compatibleEntities, meterOrGroup: MeterOrGroup.meters })
);

export const selectPlotlyGroupDeps = createAppSelector(
	[selectCommonPlotlyDependencies, selectSelectedGroups, selectCompatibleSelectedGroups],
	(deps, selectedEntities, compatibleEntities) => ({ ...deps, selectedEntities, compatibleEntities, meterOrGroup: MeterOrGroup.groups })
);
