const _ = require('lodash');
const qrcode = require('qrcode');
const OTPAuth = require('otpauth');

module.exports = ({
  MFA_OTP_TOTP_TOKEN_LENGTH = 6,
  MFA_OTP_HOTP_TOKEN_LENGTH = 8,
  MFA_OTP_BACKUP_CODES_NUMBER = 10,
}) => {
  const m = {};
  const defaultTotpOpts = {
    algorithm: 'SHA1',
    digits: MFA_OTP_TOTP_TOKEN_LENGTH,
    period: 30,
    window: 1,
  };

  const defaultHotpOpts = {
    algorithm: 'SHA1',
    digits: MFA_OTP_HOTP_TOKEN_LENGTH,
    window: MFA_OTP_BACKUP_CODES_NUMBER,
  };

  m.generateSecret = (numberOfBytes) => new OTPAuth.Secret({ size: numberOfBytes }).base32;

  m.getTotpAuthUrl = ({ label, secret, issuer }) =>
    new OTPAuth.TOTP({
      label,
      secret,
      issuer,
      ...defaultTotpOpts,
    }).toString();

  m.getQrCodeDataUrl = (totpAuthUrl) => qrcode.toDataURL(totpAuthUrl);

  m.generateBackupTokens = ({ secret, counter }) => {
    const hotpOpts = {
      ...defaultHotpOpts,
      counter,
      secret,
    };
    const hotp = new OTPAuth.HOTP(hotpOpts);

    return _.map(_.range(hotpOpts.window), () => hotp.generate());
  };

  m.verifyToken = ({ secret, token }) => {
    const delta = OTPAuth.TOTP.validate({ ...defaultTotpOpts, secret: OTPAuth.Secret.fromBase32(secret), token });
    // valid delta might be from 0 to -window (if token is changed while verifying), otherwise it's null
    return delta !== null;
  };

  m.verifyBackupToken = ({ secret, token, counter }) => {
    if (!counter) {
      return null;
    }
    // return valid delta to be stored as used counter, or null

    return OTPAuth.HOTP.validate({
      ...defaultHotpOpts,
      secret: OTPAuth.Secret.fromBase32(secret),
      token,
      counter,
    });
  };

  return m;
};
