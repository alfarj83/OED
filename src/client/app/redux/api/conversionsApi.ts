/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { createSelector } from '@reduxjs/toolkit';
import { ConversionData } from '../../types/redux/conversions';
import { baseApi } from './baseApi';
import { CikData } from '../../types/redux/ciks';

export const conversionsApi = baseApi.injectEndpoints({
	endpoints: builder => ({
		getConversionsDetails: builder.query<ConversionData[], void>({
			query: () => 'api/conversions',
			providesTags: ['ConversionDetails']
		}),
		getCikDetails: builder.query<CikData[], void>({
			query: () => 'api/ciks',
			providesTags: ['Cik']
		}),
		addConversion: builder.mutation<void, ConversionData>({
			query: conversion => ({
				url: 'api/conversions/addConversion',
				method: 'POST',
				body: conversion
			}),
			onQueryStarted: async (_arg, api) => {
				api.queryFulfilled
					.then(() => {
						api.dispatch(
							conversionsApi.endpoints.refresh.initiate({
								redoCik: true,
								refreshReadingViews: false
							}));
					});
			}

		}),
		deleteConversion: builder.mutation<void, Pick<ConversionData, 'sourceId' | 'destinationId'>>({
			query: conversion => ({
				url: 'api/conversions/delete',
				method: 'POST',
				body: conversion
			}),
			onQueryStarted: async (_, { queryFulfilled, dispatch }) => {
				// TODO write more robust logic for error handling, and manually invalidate tags instead?
				// TODO Verify Behavior w/ Maintainers
				queryFulfilled
					.then(() => {
						dispatch(conversionsApi.endpoints.refresh.initiate(
							{
								redoCik: true,
								refreshReadingViews: false
							}));
					});

			}
		}),
		editConversion: builder.mutation<void, { conversionData: ConversionData, shouldRedoCik: boolean }>({
			query: ({ conversionData }) => ({
				url: 'api/conversions/edit',
				method: 'POST',
				body: conversionData
			}),
			onQueryStarted: async ({ shouldRedoCik }, { queryFulfilled, dispatch }) => {
				// TODO write more robust logic for error handling, and manually invalidate tags instead?
				// TODO Verify Behavior w/ Maintainers
				await queryFulfilled;

				if (shouldRedoCik) {
					dispatch(conversionsApi.endpoints.refresh.initiate(
						{
							redoCik: true,
							refreshReadingViews: false
						}
					));
				} else {
					dispatch(conversionsApi.util.invalidateTags(['ConversionDetails']));
				}
			}
		}),
		refresh: builder.mutation<void, { redoCik: boolean, refreshReadingViews: boolean }>({
			query: ({ redoCik, refreshReadingViews }) => ({
				url: 'api/conversion-array/refresh',
				method: 'POST',
				body: { redoCik, refreshReadingViews }
			}),
			invalidatesTags: ['ConversionDetails', 'Cik', 'Readings']
		})
	})
});

export const selectConversionsQueryState = conversionsApi.endpoints.getConversionsDetails.select();
export const selectConversionsDetails = createSelector(
	selectConversionsQueryState,
	({ data: conversionData = [] }) => {
		return conversionData;
	}
);

const selectCikQueryState = conversionsApi.endpoints.getCikDetails.select();

export const selectCik = createSelector(
	[selectCikQueryState],
	({ data: cik = [] }) => {
		return cik;
	}
);

export const stableEmptyConversions: ConversionData[] = [];
