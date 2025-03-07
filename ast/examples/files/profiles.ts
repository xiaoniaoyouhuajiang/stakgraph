import axios from "axios";

import {
  CandidateNote,
  CandidateProfile,
  LinkedInProfile,
  Pagination,
  UploadBlueprint,
} from "utils/types";

export default {
  fetchCandidateProfiles: (params: any, page = 1, team_slug: string) => {
    return axios.get<{
      pagination: Pagination;
      results: CandidateProfile[];
    }>(`/api/candidate_profiles?team_slug=${team_slug}`, {
      params: { ...params, page },
    });
  },
  fetchCandidateProfile: (uuid: string, team_slug: string) => {
    return axios.get<{
      candidate_profile: CandidateProfile;
      notes: any;
      advisor_uuid: string;
      documents: UploadBlueprint[];
    }>(`/api/candidate_profiles/${uuid}?team_slug=${team_slug}`);
  },

  fetchProfile: (
    uuid: string,
    isCandidateUuid?: boolean,
    team_slug: string
  ) => {
    return axios.get<{
      global_person: any;
      candidate_profile: CandidateProfile;
      notes: any;
      advisor_uuid: string;
      documents: UploadBlueprint[];
    }>(`/api/candidate_profiles/${uuid}/show_v2?team_slug=${team_slug}`, {
      params: { isCandidateUuid: isCandidateUuid },
    });
  },

  enrichProfile: async (linkedInSlug: string) => {
    return axios.post<{ profile: LinkedInProfile }>(
      "/api/candidate_profiles/enrich_profile",
      {
        linkedin_id: linkedInSlug,
      }
    );
  },

  createCandidateProfile: (params: any) => {
    return axios.post<{ candidate_profile: CandidateProfile }>(
      "/api/candidate_profiles",
      params
    );
  },

  destroyCandidateProfile: (team_slug: string, uuid: string) => {
    return axios.delete<{ candidate_profile: CandidateProfile }>(
      `/api/candidate_profiles/${uuid}?team_slug=${team_slug}`
    );
  },

  updateCandidateProfile: (uuid: string, params: any) => {
    return axios.put<{ candidate_profile: CandidateProfile }>(
      `/api/candidate_profiles/${uuid}`,
      params
    );
  },

  updateCandidateProfileV2: (uuid: string, params: any) => {
    return axios.put<{ candidate_profile: CandidateProfile }>(
      `/api/v2/candidate_profiles/${uuid}`,
      params
    );
  },

  uploadCandidateDocuments: (
    teamSlug: string,
    uuid: string,
    documentsFormData: any
  ) => {
    return axios.post<{ candidate_profile: CandidateProfile }>(
      `/api/candidate_profiles/${uuid}/upload_documents?team_slug=${teamSlug}`,
      documentsFormData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
  },

  createCandidateNote: (params: any) => {
    return axios.post<{ candidate_note: CandidateNote }>(
      `/api/v2/candidate_notes`,
      params
    );
  },

  updateCandidateNote: (uuid: string, params: any) => {
    return axios.put<{ candidate_note: CandidateNote }>(
      `/api/v2/candidate_notes/${uuid}`,
      params
    );
  },

  deleteCandidateNote: (uuid: string) => {
    return axios.delete<{ candidate_note: CandidateNote }>(
      `/api/v2/candidate_notes/${uuid}`
    );
  },

  deleteCandidateDocument: (
    teamSlug: string,
    candidateUuid: string,
    uploadUuid: string
  ) => {
    return axios.delete(
      `/api/candidate_profiles/${candidateUuid}/delete_document/${uploadUuid}?team_slug=${teamSlug}`
    );
  },

  candidatesBulkActions: (params: any) => {
    return axios.put("/api/candidate_profiles/bulk_actions", params);
  },

  v2BulkActionGetMessageRecipients: (params: any) => {
    return axios.get(
      "/api/v2/candidate_profiles/bulk_actions/message_recipients",
      { params }
    );
  },
};
