import { helper } from '@ember/component/helper';

export function isTruthyStr(params/*, hash*/) {
  return params[0] == "true";
}

export default helper(isTruthyStr);
