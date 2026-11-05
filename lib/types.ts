export type Job = {
  id: string;
  title?: string | null;
  location?: string | null;
  salary?: string | null;
  owner_id?: string | null;
  phone?: string | null;
  owner_phone?: string | null;
  status?: string | null;
  is_active?: boolean | null;
  requires_proof?: boolean | null;
  proof_required?: boolean | null;
  proof_description?: string | string[] | null;
  proof_requirements?: string[] | null;
  category?: string | null;
  created_at?: string | null;
  [key: string]: any;
};

export type ProofSubmission = {
  id: string;
  job_id?: string | null;
  job_title?: string | null;
  worker_phone?: string | null;
  worker_name?: string | null;
  proof_type?: string | null;
  proof_url?: string | null;
  status?: string | null;
  created_at?: string | null;
  jobs?: Job | Job[] | null;
  [key: string]: any;
};

export type OwnerVerification = {
  id: string;
  owner_phone?: string | null;
  owner_name?: string | null;
  doc1_type?: string | null;
  doc1_front_url?: string | null;
  doc1_back_url?: string | null;
  doc2_type?: string | null;
  doc2_front_url?: string | null;
  doc2_back_url?: string | null;
  status?: string | null;
  rejection_reason?: string | null;
  created_at?: string | null;
  verified_at?: string | null;
  verified_by?: string | null;
  [key: string]: any;
};

export type Profile = {
  id: string;
  phone?: string | null;
  name?: string | null;
  role?: "owner" | "worker" | string | null;
  verified?: boolean | null;
  is_verified_owner?: boolean | null;
  blue_tick?: boolean | null;
  rating?: number | null;
  jobs_completed?: number | null;
  created_at?: string | null;
  [key: string]: any;
};

export type ProofQueueItem = ProofSubmission & {
  source: "proof_submissions" | "job_applications";
  imageUrls: string[];
  jobs?: Job | null;
};
