/** @type {import('next').NextConfig} */
const nextConfig = {
	eslint: {
		ignoreDuringBuilds: true,
	},
	typescript: {
		ignoreBuildErrors: false,
	},
	experimental: {
		serverComponentsExternalPackages: ['pg'],
	},
};
export default nextConfig;
