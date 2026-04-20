import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  getAccounts,
  serialNumberDuplicate,
  vpnIpDuplicate,
  VesselDuplicate,
  imoDuplicate,
  addVessel,
  updateVessel,
} from "@/api/vessel";

type Mode = "add" | "edit";

export function useVesselForm(mode: Mode, vesselData?: any) {
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);
  const [account, setAccount] = useState("");
  const [imo, setImo] = useState("");
  const [vesselId, setVesselId] = useState("");
  const [vpnIpPart3, setVpnIpPart3] = useState("");
  const [vpnIpPart4, setVpnIpPart4] = useState("");
  const [name, setName] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [mmsi, setMmsi] = useState("");
  const [callsign, setCallsign] = useState("");
  const [mailAddress, setMailAddress] = useState("");
  const [manager, setManager] = useState("");
  const [logo, setLogo] = useState("");
  const [saving, setSaving] = useState(false);
  const [alertState, setAlertState] = useState<{
    variant: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  // 중복 체크 상태
  const [imoChecking, setImoChecking] = useState(false);
  const [imoDuplicated, setImoDuplicated] = useState<boolean | null>(null);
  const [vesselIdChecking, setVesselIdChecking] = useState(false);
  const [vesselIdDuplicated, setVesselIdDuplicated] = useState<boolean | null>(null);
  const [vpnChecking, setVpnChecking] = useState(false);
  const [vpnDuplicated, setVpnDuplicated] = useState<boolean | null>(null);
  const [snChecking, setSnChecking] = useState(false);
  const [snDuplicated, setSnDuplicated] = useState<boolean | null>(null);

  const lastCheckedImoRef = useRef("");
  const lastCheckedVesselIdRef = useRef("");
  const lastCheckedVpnRef = useRef("");
  const lastCheckedSnRef = useRef("");

  // ✅ 초기화
  const reset = useCallback(() => {
    setAccount(""); setImo(""); setVesselId("");
    setVpnIpPart3(""); setVpnIpPart4(""); setName("");
    setSerialNumber(""); setMmsi(""); setCallsign("");
    setMailAddress(""); setManager(""); setLogo("");
    setImoDuplicated(null); setVesselIdDuplicated(null);
    setVpnDuplicated(null); setSnDuplicated(null);
    setAlertState(null);
    lastCheckedImoRef.current = "";
    lastCheckedVesselIdRef.current = "";
    lastCheckedVpnRef.current = "";
    lastCheckedSnRef.current = "";
  }, []);

  // ✅ 모달 열릴 때 초기값 세팅
  const init = useCallback(async () => {
    const data = await getAccounts();
    setOptions(data);

    if (mode === "edit" && vesselData) {
      setAccount(vesselData.acct || "");
      setVesselId(vesselData.id || "");
      const ipParts = (vesselData.vpn_ip || "").split(".");
      setVpnIpPart3(ipParts[2] || "");
      setVpnIpPart4(ipParts[3] || "");
      setName(vesselData.name || "");
      setSerialNumber(vesselData.serialNumber || "");
      setMmsi(String(vesselData.mmsi || ""));
      setCallsign(vesselData.callsign || "");
      setMailAddress(vesselData.mailAddress || "");
      setManager(vesselData.manager || "");
      setLogo(vesselData.logo || "");
      // edit 모드는 기존 값이면 중복 아님
      setVesselIdDuplicated(false);
      setVpnDuplicated(false);
      setSnDuplicated(false);
    }
  }, [mode, vesselData]);

  // 중복 체크 핸들러
  const handleImoBlur = useCallback(async () => {
    const val = imo.trim();
    if (val.length < 7 || lastCheckedImoRef.current === val) return;
    lastCheckedImoRef.current = val;
    try {
      setImoChecking(true);
      setImoDuplicated(await imoDuplicate(val));
    } finally {
      setImoChecking(false);
    }
  }, [imo]);

  const handleVesselIdBlur = useCallback(async () => {
    const id = vesselId.trim();
    if (!id) return;
    if (mode === "edit" && id === vesselData?.id) return setVesselIdDuplicated(false);
    if (lastCheckedVesselIdRef.current === id) return;
    lastCheckedVesselIdRef.current = id;
    try {
      setVesselIdChecking(true);
      setVesselIdDuplicated(await VesselDuplicate(id));
    } finally {
      setVesselIdChecking(false);
    }
  }, [vesselId, mode, vesselData]);

  const handleVpnIpBlur = useCallback(async () => {
    if (!vpnIpPart3 || !vpnIpPart4) return;
    const fullIp = `10.8.${vpnIpPart3}.${vpnIpPart4}`;
    if (mode === "edit" && fullIp === vesselData?.vpn_ip) return setVpnDuplicated(false);
    if (lastCheckedVpnRef.current === fullIp) return;
    lastCheckedVpnRef.current = fullIp;
    try {
      setVpnChecking(true);
      setVpnDuplicated(await vpnIpDuplicate(fullIp));
    } finally {
      setVpnChecking(false);
    }
  }, [vpnIpPart3, vpnIpPart4, mode, vesselData]);

  const handleSerialNumberBlur = useCallback(async () => {
    const sn = serialNumber.trim();
    if (!sn) return;
    if (mode === "edit" && sn === vesselData?.serialNumber) return setSnDuplicated(false);
    if (lastCheckedSnRef.current === sn) return;
    lastCheckedSnRef.current = sn;
    try {
      setSnChecking(true);
      setSnDuplicated(await serialNumberDuplicate(sn));
    } finally {
      setSnChecking(false);
    }
  }, [serialNumber, mode, vesselData]);

  const canSubmit = useMemo(() => {
  const requiredFilled =
    (mode === "add" ? imo.length >= 7 : true) &&
    vesselId.trim() !== "" &&
    account.trim() !== "" &&   // ✅ account 필수
    name.trim() !== "" &&      // ✅ name 필수
    vpnIpPart3 !== "" &&
    vpnIpPart4 !== "";

  const duplicateOk =
    (mode === "add" ? imoDuplicated === false : true) &&
    vesselIdDuplicated === false &&
    vpnDuplicated === false;

  return Boolean(requiredFilled && duplicateOk && !saving);
}, [
  mode, imo, vesselId, account, name,  // ✅ account, name 추가
  vpnIpPart3, vpnIpPart4,
  imoDuplicated, vesselIdDuplicated, vpnDuplicated,
  saving,
]);

const handleSubmit = useCallback(async () => {
  console.log("[submit] name 원본:", name); // ✅ 확인
  console.log("[submit] name 변환:", name.trim().toUpperCase());
  const payload = {
    imo: mode === "add" ? Number(imo) : Number(vesselData?.imo),
    id: vesselId.trim(),
    vpnIp: `10.8.${vpnIpPart3}.${vpnIpPart4}`,
    serialNumber: serialNumber.trim(),
    logo,
    manager,
    acct: account,
    mmsi: mmsi ? Number(mmsi) : 0,
    callSign: callsign.trim(),
    name: name.trim().toUpperCase(), // ✅ 대문자 변환
    mailAddress: mailAddress.trim(),
    ...(mode === "edit" && {
      fireWallId: vesselData?.fireWallId,
      fireWallPassword: vesselData?.fireWallPassword,
    }),
  };

  try {
    setSaving(true);
    const result = mode === "add"
      ? await addVessel(payload)
      : await updateVessel(payload);

    if (result) {
      setAlertState({
        variant: "success",
        title: "Success",
        message: mode === "add" ? "Registered successfully." : "Updated successfully.",
      });
      return result;
    } else {
      setAlertState({
        variant: "error",
        title: "Failed",
        message: "Request failed. Please try again.",
      });
      return null;
    }
  } catch (err: any) {
    // ✅ 네트워크 에러 등 상세 메시지
    const message = err?.message?.includes("fetch")
      ? "Network error. Please check your connection."
      : err?.message || "An unexpected error occurred.";

    setAlertState({
      variant: "error",
      title: "Error",
      message,
    });
    return null;
  } finally {
    setSaving(false);
  }
}, [mode, imo, vesselId, vpnIpPart3, vpnIpPart4, serialNumber, logo, manager, account, mmsi, callsign, name, mailAddress, vesselData]);

  return {
    // 상태
    options, account, setAccount,
    imo, setImo,
    vesselId, setVesselId,
    vpnIpPart3, setVpnIpPart3,
    vpnIpPart4, setVpnIpPart4,
    name, setName,
    serialNumber, setSerialNumber,
    mmsi, setMmsi,
    callsign, setCallsign,
    mailAddress, setMailAddress,
    manager, setManager,
    logo, setLogo,
    saving, alertState,
    // 중복 체크
    imoChecking, imoDuplicated, setImoDuplicated,
    vesselIdChecking, vesselIdDuplicated, setVesselIdDuplicated,
    vpnChecking, vpnDuplicated, setVpnDuplicated,
    snChecking, snDuplicated, setSnDuplicated,
    // 메서드
    init, reset,
    handleImoBlur, handleVesselIdBlur,
    handleVpnIpBlur, handleSerialNumberBlur,
    canSubmit, handleSubmit,
  };
}