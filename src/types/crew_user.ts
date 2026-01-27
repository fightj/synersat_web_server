export type CrewUser = {
  description?: string;
  varusershalftimeperiod?: string; // half
  varusersmaxtotaloctetstimerange?: string; // e.g. "monthly"
  varuserscreatedate?: string;
  varusersusername: string; // ID
  varuserspassword?: string;
  varusersmaxtotaloctets?: string; // max MB (string)
  // varusersusage?: string; // used MB (string) ✅ 추가
  type?: "starlink" | "vsat"; // ✅ 고정
  duty?: string;
  updatedAt?: string;
  // varusersislogin?: boolean;
};