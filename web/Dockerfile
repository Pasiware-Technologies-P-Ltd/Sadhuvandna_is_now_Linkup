FROM php:8.2-apache

# Install only required PHP extensions: MySQL (mysqli)
ADD --chmod=0755 https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/

RUN install-php-extensions mysqli

# Enable Apache rewrite and headers modules
RUN a2enmod rewrite headers

# Allow .htaccess rewrites
RUN sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

# Configure PHP settings (upload limits, execution time, memory, timezone)
RUN echo "upload_max_filesize = 256M" > /usr/local/etc/php/conf.d/custom.ini \
    && echo "post_max_size = 256M" >> /usr/local/etc/php/conf.d/custom.ini \
    && echo "memory_limit = 512M" >> /usr/local/etc/php/conf.d/custom.ini \
    && echo "max_execution_time = 300" >> /usr/local/etc/php/conf.d/custom.ini \
    && echo "max_input_time = 300" >> /usr/local/etc/php/conf.d/custom.ini \
    && echo "date.timezone = Asia/Kolkata" >> /usr/local/etc/php/conf.d/custom.ini

# Set working directory
WORKDIR /var/www/html

# Copy application files (web portal & admin panel)
COPY . /var/www/html/

# Create required upload directories with write permissions
RUN mkdir -p /var/www/html/uploads \
    /var/www/html/uploads/photo \
    /var/www/html/uploads/family \
    /var/www/html/uploads/news \
    /var/www/html/uploads/jobs \
    /var/www/html/uploads/gallery \
    /var/www/html/uploads/frames \
    /var/www/html/uploads/music \
    /var/www/html/uploads/chat \
    /var/www/html/images \
    && chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html \
    && chmod -R 777 /var/www/html/uploads \
    && chmod -R 777 /var/www/html/images

# Expose port 80
EXPOSE 80

CMD ["apache2-foreground"]
