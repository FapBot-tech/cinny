import React, { useMemo } from 'react';
import { Box, Text, color, Button } from 'folds';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { SSOAction } from 'matrix-js-sdk';
import { useAuthFlows } from '../../../hooks/useAuthFlows';
import { useAuthServer } from '../../../hooks/useAuthServer';
import { useParsedLoginFlows } from '../../../hooks/useParsedLoginFlows';
import { PasswordLoginForm } from './PasswordLoginForm';
import { SSOLogin } from '../SSOLogin';
import { TokenLogin } from './TokenLogin';
import { OrDivider } from '../OrDivider';
import * as styles from '../styles.css';
import { getLoginPath, getRegisterPath, withSearchParam } from '../../pathUtils';
import { usePathWithOrigin } from '../../../hooks/usePathWithOrigin';
import { LoginPathSearchParams } from '../../paths';
import { useClientConfig } from '../../../hooks/useClientConfig';
import {ContainerColor} from "../../../styles/ContainerColor.css";
import {convertToRGBA} from "pdfjs-dist/types/src/shared/image_utils";

const getLoginTokenSearchParam = () => {
  // when using hasRouter query params in existing route
  // gets ignored by react-router, so we need to read it ourself
  // we only need to read loginToken as it's the only param that
  // is provided by external entity. example: SSO login
  const parmas = new URLSearchParams(window.location.search);
  const loginToken = parmas.get('loginToken');
  return loginToken ?? undefined;
};

const useLoginSearchParams = (searchParams: URLSearchParams): LoginPathSearchParams =>
  useMemo(
    () => ({
      username: searchParams.get('username') ?? undefined,
      email: searchParams.get('email') ?? undefined,
      loginToken: searchParams.get('loginToken') ?? undefined,
    }),
    [searchParams]
  );

export function Login() {
  const navigate = useNavigate();
  const server = useAuthServer();
  const { hashRouter } = useClientConfig();
  const { loginFlows } = useAuthFlows();
  const [searchParams] = useSearchParams();
  const loginSearchParams = useLoginSearchParams(searchParams);
  const ssoRedirectUrl = usePathWithOrigin(getLoginPath(server));
  const loginTokenForHashRouter = getLoginTokenSearchParam();
  const absoluteLoginPath = usePathWithOrigin(getLoginPath(server));

  if (hashRouter?.enabled && loginTokenForHashRouter) {
    window.location.replace(
      withSearchParam(absoluteLoginPath, {
        loginToken: loginTokenForHashRouter,
      })
    );
  }

  const parsedFlows = useParsedLoginFlows(loginFlows.flows);

  return (
    <div>
      <Box direction="Column" gap="400">
        <Text size="H2" priority="400">
          Login
        </Text>
        <Text priority="300">
            Welcome to FapRealm. Join our vibrant, moderated community for real-time adult chat and erotic roleplay. A safe, respectful space to connect and explore.
        </Text>
        {parsedFlows.token && loginSearchParams.loginToken && (
          <TokenLogin token={loginSearchParams.loginToken} />
        )}
        {parsedFlows.password && (
          <>
            <PasswordLoginForm
              defaultUsername={loginSearchParams.username}
              defaultEmail={loginSearchParams.email}
            />
            {parsedFlows.sso && <OrDivider />}
          </>
        )}
        {parsedFlows.sso && (
          <>
            <SSOLogin
              providers={parsedFlows.sso.identity_providers}
              redirectUrl={ssoRedirectUrl}
              action={SSOAction.LOGIN}
              saveScreenSpace={parsedFlows.password !== undefined}
            />
            <span data-spacing-node />
          </>
        )}
        {!parsedFlows.password && !parsedFlows.sso && (
          <>
            <Text style={{ color: color.Critical.Main }}>
              {`This client does not support login on "${server}" homeserver. Password and SSO based login method not found.`}
            </Text>
            <span data-spacing-node />
          </>
        )}
        <Box direction="Column" gap="200" alignItems="Center">
          <OrDivider />
          <Button
            className={styles.CtaButton}
            style={{ width: '100%' }}
            variant="Secondary"
            fill="None"
            outlined
            size="500"
            onClick={() => navigate(getRegisterPath(server))}
          >
            <Text as="span" size="B500">
              Create an account
            </Text>
          </Button>
        </Box>
      </Box>
    </div>
  );
}
