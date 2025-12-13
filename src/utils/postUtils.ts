import { ParsedQs } from 'qs';

const queryToFilterMappings: Record<string, string> = {
  sender: 'authorId',
};

export const mapPostQueryToFilter = (query: ParsedQs) =>
  Object.keys(query).reduce((filterObj: Record<string, any>, queryKey) => {
    const filterKey = queryToFilterMappings[queryKey];

    if (filterKey) {
      filterObj[filterKey] = query[queryKey];
    } else {
      filterObj[queryKey] = query[queryKey];
    }

    return filterObj;
  }, {});
