'use strict';

exports.sleep = (tm = 0) => {
  return new Promise(resolve => {
    setTimeout(resolve, tm);
  });
};
