import { axiosClient } from '../api/axiosClient.js';
import { getSelectedOrganisateurId } from './organisateurContext.js';

function resolveOrganisateurId(meta) {
  return meta?.organisateurId || getSelectedOrganisateurId();
}

function resourcePath(resource, meta) {
  switch (resource) {
    case 'organisateurs':
      return '/admin/organisateurs';
    case 'users':
      return '/admin/users';
    case 'events': {
      const organisateurId = resolveOrganisateurId(meta);
      return `/admin/organisateurs/${organisateurId}/events`;
    }
    case 'categories': {
      const organisateurId = resolveOrganisateurId(meta);
      return `/admin/organisateurs/${organisateurId}/events/${meta.eventId}/categories`;
    }
    case 'organismes': {
      const organisateurId = resolveOrganisateurId(meta);
      return `/admin/organisateurs/${organisateurId}/events/${meta.eventId}/organismes`;
    }
    case 'participants': {
      const organisateurId = resolveOrganisateurId(meta);
      return `/admin/organisateurs/${organisateurId}/events/${meta.eventId}/participants`;
    }
    default:
      throw new Error(`Unknown resource: ${resource}`);
  }
}

function withId(item) {
  return { ...item, id: item._id };
}

export const dataProvider = {
  async getList(resource, params) {
    const { page, perPage } = params.pagination || { page: 1, perPage: 10 };
    const { field, order } = params.sort || {};
    const query = {
      page,
      limit: perPage,
      ...params.filter,
    };
    if (field) {
      query.sortField = field;
      query.sortOrder = order;
    }

    const { data } = await axiosClient.get(resourcePath(resource, params.meta), { params: query });
    return { data: data.items.map(withId), total: data.total };
  },

  async getOne(resource, params) {
    const path = resourcePath(resource, params.meta);
    const { data } = await axiosClient.get(`${path}/${params.id}`);
    return { data: withId(data) };
  },

  async getMany(resource, params) {
    const path = resourcePath(resource, params.meta);
    const results = await Promise.all(params.ids.map((id) => axiosClient.get(`${path}/${id}`)));
    return { data: results.map((r) => withId(r.data)) };
  },

  async getManyReference(resource, params) {
    const query = {
      page: params.pagination?.page || 1,
      limit: params.pagination?.perPage || 10,
      [params.target]: params.id,
      ...params.filter,
    };
    const { data } = await axiosClient.get(resourcePath(resource, params.meta), { params: query });
    return { data: data.items.map(withId), total: data.total };
  },

  async create(resource, params) {
    const path = resourcePath(resource, params.meta);
    const { data } = await axiosClient.post(path, params.data);
    return { data: withId(data) };
  },

  async update(resource, params) {
    const path = resourcePath(resource, params.meta);
    const { data } = await axiosClient.put(`${path}/${params.id}`, params.data);
    return { data: withId(data) };
  },

  async updateMany(resource, params) {
    const path = resourcePath(resource, params.meta);
    await Promise.all(params.ids.map((id) => axiosClient.put(`${path}/${id}`, params.data)));
    return { data: params.ids };
  },

  async delete(resource, params) {
    const path = resourcePath(resource, params.meta);
    const { data } = await axiosClient.delete(`${path}/${params.id}`);
    return { data: data ? withId(data) : { id: params.id } };
  },

  async deleteMany(resource, params) {
    const path = resourcePath(resource, params.meta);
    await Promise.all(params.ids.map((id) => axiosClient.delete(`${path}/${id}`)));
    return { data: params.ids };
  },
};
