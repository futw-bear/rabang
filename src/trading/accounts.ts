import { badRequestResponse, notFoundResponse } from "../http/responses";
import type { Account } from "fubon-neo";

export function selectAccount(url: URL, accounts: Account[]): Account | Response {
  if (accounts.length === 0) {
    return badRequestResponse("No authenticated trading accounts are available.");
  }

  const accountNo = optionalQueryParam(url, "account");
  const branchNo = optionalQueryParam(url, "branchNo");
  const accountType = optionalQueryParam(url, "accountType");

  if (!accountNo && !branchNo && !accountType) {
    return accounts[0]!;
  }

  const account = accounts.find((candidate) => {
    return (
      (!accountNo || candidate.account === accountNo) &&
      (!branchNo || candidate.branchNo === branchNo) &&
      (!accountType || candidate.accountType === accountType)
    );
  });

  return account ?? notFoundResponse();
}

export function requireQueryParam(url: URL, name: string): string | Response {
  const value = optionalQueryParam(url, name);
  return value ?? badRequestResponse(`Missing required query parameter: ${name}`);
}

export function optionalQueryParam(url: URL, name: string): string | undefined {
  const value = url.searchParams.get(name)?.trim();
  return value || undefined;
}
