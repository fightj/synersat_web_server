export const PROTOCOL_OPTIONS = [
  { value: "tcp", label: "TCP" },
  { value: "udp", label: "UDP" },
  { value: "tcp/udp", label: "TCP/UDP" },
  { value: "icmp", label: "ICMP" },
  { value: "esp", label: "ESP" },
  { value: "ah", label: "AH" },
  { value: "gre", label: "GRE" },
  { value: "ipv6", label: "IPV6" },
  { value: "igmp", label: "IGMP" },
  { value: "pim", label: "PIM" },
  { value: "ospf", label: "OSPF" },
];

export const ANY_OTHER_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "other", label: "Other" },
];

export const RULE_TYPE_OPTIONS = [
  { value: "[System Rule]", label: "[System Rule]" },
  { value: "[User Rule]", label: "[User Rule]" },
];