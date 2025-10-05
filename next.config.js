/** @type {import('next').NextConfig} */
const nextConfig = {
	eslint: {
		ignoreDuringBuilds: true,
	},
	typescript: {
		ignoreBuildErrors: false,
	},
	serverExternalPackages: ['pg'],
	async rewrites() {
		return [
			{
				source: '/api/external/:path*',
				destination: 'https://models.dev/:path*',
			},
		];
	},
};
export default nextConfig;
