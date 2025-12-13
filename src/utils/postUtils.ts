import { PostQueryParams } from '../types/postInterfaces';

const queryToFilterMappings: Record<keyof PostQueryParams, string> = {
  sender: 'authorId',
};

export const mapPostQueryToFilter = (query: PostQueryParams) =>
  Object.entries(query).reduce(
    (filterObj: Record<string, any>, [queryKey, queryValue]) => {
      const filterKey =
        queryToFilterMappings[queryKey as keyof PostQueryParams];

      if (filterKey) {
        filterObj[filterKey] = queryValue;
      } else {
        filterObj[queryKey] = queryValue;
      }

      return filterObj;
    },
    {}
  );
